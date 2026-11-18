/** The checks of one dataset folder: its JSON files, the downloads, the pack, and every cluster in it. */

import { type Bundle, BundleError, bundleFromMember } from "../pack";
import { type Cluster, Clusters, Dataset, type DatasetEntry, Loci, preOrder } from "../schemas";
import { type UstarEntry, parseUstar } from "../ustar";
import { gunzipFirstMember, gunzipMember, isGzip } from "./gzip";
import { type Rule, errorMessage, found, hex } from "./report";
import { ByteReader } from "./source";
import { UstarStream } from "./tar";
import { CONSENSUS, accessionOf, fastaIds, newickTips, renderMetadataTsv } from "./text";
import type { ReleaseContext, Verifier } from "./verifier";

/** Size of the tar end marker: two zero blocks. */
const END_MARKER_BYTES = 1024;

/** Messages per file and rule that list single items, such as missing files; the rest is counted in one line. */
const LIST_LIMIT = 10;

/** SHA-256 of the full alignments of the pack, by entry name `<dataset>/geneCluster/<id>_<aa|na>_aln.fa`. */
type AlignmentHashes = Map<string, string>;

/** The facts of a dataset that the cluster checks need. */
interface DatasetFacts {
  readonly id: string;
  readonly base: string;
  readonly dataset: Dataset | undefined;
  readonly accessions: ReadonlySet<string> | undefined;
  readonly nonRootNodes: number | undefined;
  readonly loci: Loci | undefined;
}

/** Run every check of one dataset; return its `clusters.json` when it passed its checks, for the range reads. */
export async function verifyDataset(
  verifier: Verifier,
  release: ReleaseContext,
  entry: DatasetEntry,
): Promise<Clusters | undefined> {
  const base = `${release.id}/${entry.id}`;
  verifier.report.counts.datasets += 1;
  const dataset = await verifier.readJson(`${base}/dataset.json`, Dataset, release);
  const clusters = await verifier.readJson(`${base}/clusters.json`, Clusters, release);
  const loci = await verifier.readJson(`${base}/loci.json`, Loci, release);
  verifier.report.counts.clusters += clusters?.clusters.length ?? 0;

  if (dataset !== undefined) {
    if (dataset.id !== entry.id) {
      verifier.violation(`${base}/dataset.json`, "dataset-id", `id is ${found(dataset.id)}, the folder is ${entry.id}`);
    }
    if (dataset.strains.length !== entry.strains) {
      verifier.violation(
        `${release.id}/index.json`,
        "index-counts",
        `dataset ${entry.id} has strains ${entry.strains}, dataset.json has ${dataset.strains.length}`,
      );
    }
  }
  if (clusters !== undefined && clusters.clusters.length !== entry.clusters) {
    verifier.violation(
      `${release.id}/index.json`,
      "index-counts",
      `dataset ${entry.id} has clusters ${entry.clusters}, clusters.json has ${clusters.clusters.length}`,
    );
  }
  if (dataset !== undefined && clusters !== undefined) {
    checkExtra(verifier, `${base}/clusters.json`, dataset, clusters);
  }
  if (loci !== undefined && clusters !== undefined && loci.loci.length !== clusters.clusters.length) {
    verifier.violation(
      `${base}/loci.json`,
      "loci-length",
      `loci has ${loci.loci.length} entries, clusters.json has ${clusters.clusters.length} clusters`,
    );
  }

  await checkNewick(verifier, release, `${base}/strain_tree.nwk`, dataset);
  await checkMetadataTsv(verifier, release, `${base}/metadata.tsv`, dataset);

  const facts: DatasetFacts = {
    id: entry.id,
    base,
    dataset,
    accessions: dataset === undefined ? undefined : new Set(dataset.strains.map((strain) => strain.accession)),
    nonRootNodes: dataset === undefined ? undefined : preOrder(dataset.strain_tree).length - 1,
    loci:
      loci !== undefined && clusters !== undefined && loci.loci.length === clusters.clusters.length ? loci : undefined,
  };
  const hashes = await checkPack(verifier, release, facts, clusters);
  for (const archive of ALIGNMENT_ARCHIVES) {
    // The archives are checked one after another, so the memory holds one archive only.
    // oxlint-disable-next-line no-await-in-loop
    await checkAlignmentArchive(verifier, release, facts, archive, clusters, hashes);
  }
  return clusters;
}

function checkExtra(verifier: Verifier, path: string, dataset: Dataset, clusters: Clusters): void {
  const keys = new Set(dataset.cluster_columns.map((column) => column.key));
  for (const [index, cluster] of clusters.clusters.entries()) {
    const extra = Object.keys(cluster.extra);
    if (extra.length !== keys.size || extra.some((key) => !keys.has(key))) {
      verifier.violation(
        path,
        "cluster-extra",
        `clusters[${index}] (${cluster.id}): extra has keys ${found(extra)}, cluster_columns has ${found([...keys])}`,
      );
    }
  }
}

/** Load a text object; report `textRule` for a text that is not UTF-8. */
async function loadText(
  verifier: Verifier,
  release: ReleaseContext,
  path: string,
  textRule: Rule,
): Promise<string | undefined> {
  const bytes = await verifier.load(path, release);
  return bytes === undefined ? undefined : verifier.decodeText(path, bytes, textRule);
}

async function checkNewick(
  verifier: Verifier,
  release: ReleaseContext,
  path: string,
  dataset: Dataset | undefined,
): Promise<void> {
  const text = await loadText(verifier, release, path, "newick-tips");
  if (text === undefined || dataset === undefined) {
    verifier.report.skip();
    return;
  }
  let tips: string[];
  try {
    tips = newickTips(text);
  } catch (error) {
    verifier.violation(path, "newick-tips", `the tree does not parse: ${errorMessage(error)}`);
    return;
  }
  const accessions = dataset.strains.map((strain) => strain.accession);
  for (const message of listDifferences(tips, accessions, "tip", "strain")) {
    verifier.violation(path, "newick-tips", message);
  }
}

async function checkMetadataTsv(
  verifier: Verifier,
  release: ReleaseContext,
  path: string,
  dataset: Dataset | undefined,
): Promise<void> {
  const text = await loadText(verifier, release, path, "metadata-tsv");
  if (text === undefined || dataset === undefined) {
    verifier.report.skip();
    return;
  }
  const expected = renderMetadataTsv(dataset);
  if (text === expected) {
    return;
  }
  const lines = text.split("\n");
  const expectedLines = expected.split("\n");
  const index = lines.findIndex((line, position) => line !== expectedLines[position]);
  const line = index === -1 ? expectedLines.length : index;
  verifier.violation(
    path,
    "metadata-tsv",
    `line ${line + 1} is ${found(lines[line] ?? null)}, the strains give ${found(expectedLines[line] ?? null)}`,
  );
}

/**
 * Check the pack while it streams: each cluster's range is one gzip member with the cluster's entries, and the end
 * member follows the last cluster. Return the SHA-256 of the full alignments, or `undefined` when the pack could not
 * be read by its ranges.
 */
async function checkPack(
  verifier: Verifier,
  release: ReleaseContext,
  facts: DatasetFacts,
  clusters: Clusters | undefined,
): Promise<AlignmentHashes | undefined> {
  const path = `${facts.base}/gene_clusters.tar.gz`;
  let stream: AsyncIterable<Uint8Array> | undefined;
  try {
    stream = await verifier.source.stream(path);
  } catch (error) {
    verifier.violation(path, "read", errorMessage(error));
    return undefined;
  }
  if (stream === undefined) {
    verifier.report.skip();
    return undefined;
  }
  verifier.report.counts.objects += 1;
  const hasher = new Bun.CryptoHasher("sha256");
  let size = 0;
  const reader = new ByteReader(stream, (chunk) => {
    hasher.update(chunk);
    size += chunk.length;
  });
  const hashes: AlignmentHashes = new Map();
  const tarFields = new TarFields();
  let complete = clusters !== undefined;
  try {
    for (const [index, cluster] of (clusters?.clusters ?? []).entries()) {
      const [first, last] = cluster.range;
      // The members arrive in file order; each one is checked before the next is read.
      // oxlint-disable-next-line no-await-in-loop
      const bytes = await reader.read(last - first + 1);
      if (bytes.length < last - first + 1) {
        verifier.violation(
          path,
          "pack",
          `the file ends at byte ${first + bytes.length}, inside the range of cluster ${cluster.id}`,
        );
        complete = false;
        break;
      }
      // oxlint-disable-next-line no-await-in-loop
      await checkMember(verifier, path, facts, cluster, index, bytes, hashes, tarFields);
    }
    const end = await reader.rest();
    if (complete) {
      await checkEndMember(verifier, path, end);
    }
  } catch (error) {
    verifier.violation(path, "read", errorMessage(error));
    complete = false;
  } finally {
    await reader.close();
  }
  tarFields.report(verifier, path, "pack");
  verifier.checkStored(release, path, size, hasher.digest("hex"));
  if (clusters === undefined) {
    verifier.report.skip();
  }
  return complete ? hashes : undefined;
}

/** Check the member of one cluster: gzip, ustar, the entries of the cluster, and their contents. */
async function checkMember(
  verifier: Verifier,
  path: string,
  facts: DatasetFacts,
  cluster: Cluster,
  index: number,
  bytes: Uint8Array,
  hashes: AlignmentHashes,
  tarFields: TarFields,
): Promise<void> {
  const where = `cluster ${cluster.id}`;
  let data: Uint8Array;
  try {
    const member = await gunzipMember(bytes);
    if (!member.fixedHeader) {
      verifier.violation(path, "pack", `${where}: gzip header ${hex(bytes.subarray(0, 10))} is not the fixed header`);
    }
    if (member.trailing > 0) {
      verifier.violation(path, "pack", `${where}: the range holds ${member.trailing} bytes after its gzip member`);
    }
    data = member.data;
  } catch (error) {
    verifier.violation(path, "pack", `${where}: the range is no complete gzip member (${errorMessage(error)})`);
    return;
  }
  let entries: readonly UstarEntry[];
  let bundle: Bundle;
  try {
    entries = parseUstar(data).entries;
    bundle = bundleFromMember(data, cluster, facts.id);
  } catch (error) {
    const message = error instanceof BundleError ? error.message : `${where}: ${errorMessage(error)}`;
    verifier.violation(path, "pack", message);
    return;
  }
  for (const entry of entries) {
    tarFields.check(entry);
  }
  const directory = `${facts.id}/geneCluster/${cluster.id}`;
  for (const entry of entries) {
    if (entry.name === `${directory}_aa_aln.fa` || entry.name === `${directory}_na_aln.fa`) {
      hashes.set(entry.name, new Bun.CryptoHasher("sha256").update(entry.data).digest("hex"));
    }
  }
  checkBundle(verifier, path, facts, cluster, index, bundle);
}

/** Check the contents of one bundle against the dataset. */
function checkBundle(
  verifier: Verifier,
  path: string,
  facts: DatasetFacts,
  cluster: Cluster,
  index: number,
  bundle: Bundle,
): void {
  const where = `cluster ${cluster.id}`;
  if (facts.nonRootNodes !== undefined && bundle.patterns.patterns.length !== facts.nonRootNodes) {
    verifier.violation(
      path,
      "patterns-length",
      `${where}: the pattern has ${bundle.patterns.patterns.length} characters, the strain tree has ${facts.nonRootNodes} non-root nodes`,
    );
  }

  const alignments: [string, string][] = [
    ["_na_aln.fa", bundle.naAln],
    ["_na_aln_reduced.fa", bundle.naAlnReduced],
    ...(bundle.kind === "protein"
      ? ([
          ["_aa_aln.fa", bundle.aaAln],
          ["_aa_aln_reduced.fa", bundle.aaAlnReduced],
        ] satisfies [string, string][])
      : []),
  ];
  const ids = new Map(alignments.map(([suffix, text]) => [suffix, fastaIds(text)]));

  const { accessions } = facts;
  if (accessions !== undefined) {
    const unknown = new Set<string>();
    for (const tip of bundle.tree === undefined ? [] : preOrder(bundle.tree)) {
      if (tip.children === undefined && tip.accession !== undefined && !accessions.has(tip.accession)) {
        unknown.add(`gene tree tip ${tip.accession}`);
      }
    }
    for (const [suffix, records] of ids) {
      for (const id of records) {
        if (id !== CONSENSUS && !accessions.has(accessionOf(id))) {
          unknown.add(`${cluster.id}${suffix} record ${id}`);
        }
      }
    }
    if (unknown.size > 0) {
      verifier.violation(path, "accessions", `${where}: no strain of the dataset for ${listed([...unknown])}`);
    }
  }

  for (const kind of bundle.kind === "protein" ? ["na", "aa"] : ["na"]) {
    const full = ids.get(`_${kind}_aln.fa`) ?? [];
    const reduced = ids.get(`_${kind}_aln_reduced.fa`) ?? [];
    const records = reduced[0] === CONSENSUS ? reduced.slice(1) : reduced;
    for (const message of listDifferences(records, full, "reduced record", "full record")) {
      verifier.violation(path, "reduced-alignment", `${where} ${kind}: ${message}`);
    }
  }

  const loci = facts.loci?.loci[index]?.split(" ");
  const records = ids.get("_na_aln.fa") ?? [];
  if (loci !== undefined) {
    const position = Math.max(loci.length, records.length) === 0 ? -1 : firstDifference(loci, records);
    if (position !== -1) {
      verifier.violation(
        `${facts.base}/loci.json`,
        "loci",
        `loci[${index}] (${cluster.id}) at position ${position} is ${found(loci[position] ?? null)}, the nucleotide alignment has ${found(records[position] ?? null)}`,
      );
    }
  }
}

/** Return the first position where two lists differ, or -1 when they are equal. */
function firstDifference(left: readonly string[], right: readonly string[]): number {
  const length = Math.max(left.length, right.length);
  for (let position = 0; position < length; position += 1) {
    if (left[position] !== right[position]) {
      return position;
    }
  }
  return -1;
}

/** Check the end member of the pack: one gzip member of at least 1,024 zero bytes, and nothing after it. */
async function checkEndMember(verifier: Verifier, path: string, bytes: Uint8Array): Promise<void> {
  if (bytes.length === 0) {
    verifier.violation(path, "pack", "the end member is missing after the last cluster");
    return;
  }
  try {
    const member = await gunzipMember(bytes);
    if (!member.fixedHeader) {
      verifier.violation(path, "pack", `end member: gzip header ${hex(bytes.subarray(0, 10))} is not the fixed header`);
    }
    if (member.trailing > 0) {
      verifier.violation(path, "pack", `${member.trailing} bytes follow the end member`);
    }
    if (member.data.length < END_MARKER_BYTES || member.data.some((byte) => byte !== 0)) {
      verifier.violation(
        path,
        "pack",
        `the end member holds ${member.data.length} bytes that are not all zero, in place of at least ${END_MARKER_BYTES} zero bytes`,
      );
    }
  } catch (error) {
    verifier.violation(path, "pack", `the end member is no complete gzip member (${errorMessage(error)})`);
  }
}

/** Collector of the entries whose tar header fields differ from mode 0644, uid and gid 0, and empty names. */
class TarFields {
  readonly #faults: string[] = [];

  /** Note the fields of an entry that differ. */
  check(entry: Pick<UstarEntry, "name" | "mode" | "uid" | "gid" | "uname" | "gname">): void {
    const differing = [
      entry.mode === 0o644 ? "" : `mode ${entry.mode.toString(8)}`,
      entry.uid === 0 ? "" : `uid ${entry.uid}`,
      entry.gid === 0 ? "" : `gid ${entry.gid}`,
      entry.uname === "" ? "" : `user ${found(entry.uname)}`,
      entry.gname === "" ? "" : `group ${found(entry.gname)}`,
    ].filter((fault) => fault !== "");
    if (differing.length > 0) {
      this.#faults.push(`${entry.name} has ${differing.join(", ")}`);
    }
  }

  /** Report the noted entries in one line. */
  report(verifier: Verifier, path: string, rule: Rule): void {
    const [first] = this.#faults;
    if (first !== undefined) {
      verifier.violation(
        path,
        rule,
        `${this.#faults.length} entries differ from mode 644, uid 0, gid 0, and empty user and group names; ${first}`,
      );
    }
  }
}

/** The two alignment archives: the folder of their entries, and which `protein` clusters they hold. */
const ALIGNMENT_ARCHIVES = [
  {
    file: "core_gene_alignments.tar.gz",
    folder: "core_genes",
    holds: (cluster: Cluster, strains: number) => cluster.strains === strains && cluster.duplications.length === 0,
  },
  { file: "all_gene_alignments.tar.gz", folder: "all_genes", holds: () => true },
] as const;

/** Check an alignment archive: one gzip stream, ustar, exactly the files of its rule, byte-equal to the pack. */
async function checkAlignmentArchive(
  verifier: Verifier,
  release: ReleaseContext,
  facts: DatasetFacts,
  archive: (typeof ALIGNMENT_ARCHIVES)[number],
  clusters: Clusters | undefined,
  hashes: AlignmentHashes | undefined,
): Promise<void> {
  const path = `${facts.base}/${archive.file}`;
  const bytes = await verifier.load(path, release);
  if (bytes === undefined || clusters === undefined || hashes === undefined || facts.dataset === undefined) {
    verifier.report.skip();
    return;
  }
  const strains = facts.dataset.strains.length;
  // Entry name in the archive -> entry name of the same file in the pack.
  const expected = new Map<string, string>();
  for (const cluster of clusters.clusters) {
    if (cluster.kind === "protein" && archive.holds(cluster, strains)) {
      for (const kind of ["aa", "na"]) {
        expected.set(
          `${archive.folder}/${cluster.id}_${kind}_aln.fa`,
          `${facts.id}/geneCluster/${cluster.id}_${kind}_aln.fa`,
        );
      }
    }
  }

  const fault = (message: string) => verifier.violation(path, "alignment-archives", message);
  if (!isGzip(bytes)) {
    fault("the archive is no gzip stream");
    return;
  }
  const seen = new Set<string>();
  const extra: string[] = [];
  const differing: string[] = [];
  const tarFields = new TarFields();
  const tar = new UstarStream((entry) => {
    tarFields.check(entry);
    const packEntry = expected.get(entry.name);
    if (packEntry === undefined || seen.has(entry.name)) {
      extra.push(entry.name);
      return;
    }
    seen.add(entry.name);
    if (hashes.get(packEntry) !== new Bun.CryptoHasher("sha256").update(entry.data).digest("hex")) {
      differing.push(entry.name);
    }
  });
  try {
    const member = await gunzipFirstMember(bytes, (chunk) => tar.push(chunk));
    if (!member.fixedHeader) {
      fault(`gzip header ${hex(bytes.subarray(0, 10))} is not the fixed header`);
    }
    if (member.trailing > 0) {
      fault(`${member.trailing} bytes follow the gzip stream; the archive must be one gzip stream`);
    }
    const end = tar.end();
    if (end.endOffset === null || end.endBytes < END_MARKER_BYTES || end.nonZeroAfterEnd) {
      fault(`the archive does not end with at least ${END_MARKER_BYTES} zero bytes after its last entry`);
    }
  } catch (error) {
    fault(`the archive does not read: ${errorMessage(error)}`);
    return;
  }
  tarFields.report(verifier, path, "alignment-archives");
  const missing = [...expected.keys()].filter((name) => !seen.has(name));
  if (extra.length > 0) {
    fault(`unexpected or repeated files ${listed(extra)}`);
  }
  if (missing.length > 0) {
    fault(`missing files ${listed(missing)}`);
  }
  if (differing.length > 0) {
    fault(`files that differ from the full alignments of the pack: ${listed(differing)}`);
  }
}

/** Return the messages for the differences of two lists that must hold the same items, each once. */
function listDifferences(
  actual: readonly string[],
  expected: readonly string[],
  item: string,
  other: string,
): string[] {
  const expectedSet = new Set(expected);
  const seen = new Set<string>();
  const repeated: string[] = [];
  const extra: string[] = [];
  for (const value of actual) {
    if (seen.has(value)) {
      repeated.push(value);
    } else if (!expectedSet.has(value)) {
      extra.push(value);
    }
    seen.add(value);
  }
  const missing = expected.filter((value) => !seen.has(value));
  return [
    ...(repeated.length > 0 ? [`repeated ${item}s ${listed(repeated)}`] : []),
    ...(extra.length > 0 ? [`${item}s without a ${other}: ${listed(extra)}`] : []),
    ...(missing.length > 0 ? [`${other}s without a ${item}: ${listed(missing)}`] : []),
  ];
}

/** Return the first items of a list for a message, with the count of the rest. */
function listed(items: readonly string[]): string {
  const shown = items.slice(0, LIST_LIMIT).map((item) => JSON.stringify(item));
  return items.length > LIST_LIMIT ? `${shown.join(", ")} and ${items.length - LIST_LIMIT} more` : shown.join(", ");
}
