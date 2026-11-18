/** The rules of the verifier and the report of their violations. */

/** Every rule that the verifier checks, with its description (docs/data-format.md, "What makes a deployment valid"). */
export const RULES = {
  read: "every object of the layout exists and can be read",
  schema: "every JSON file is UTF-8 JSON and passes its schema",
  "releases-folders": "releases.json names only existing release folders",
  "release-id": "index.json and manifest.json name the release of their folder",
  "dataset-files": "every dataset of index.json has its folder with all 8 files",
  "linked-datasets": "the default release has every dataset that the home page links to",
  "dataset-id": "the id of dataset.json equals its folder name",
  "index-counts": "strains and clusters of the index.json entry equal the counts in dataset.json and clusters.json",
  "newick-tips": "the tips of strain_tree.nwk equal the strains",
  "metadata-tsv": "metadata.tsv equals the rendering of the strains",
  "cluster-extra": "extra of every cluster has exactly the cluster_columns keys",
  "loci-length": "loci has the length of clusters",
  "patterns-length": "every _patterns.json has one character per non-root node of the strain tree",
  accessions: "every gene-tree tip and every FASTA record except consensus names a strain of the dataset",
  "reduced-alignment":
    "a reduced alignment holds an optional first consensus, then exactly the records of its full alignment",
  loci: "loci[i], split at its spaces, equals the record identifiers of the full nucleotide alignment of clusters[i], in record order",
  pack: "the pack: contiguous ranges, one gzip member per cluster with the fixed header, ustar entries of the cluster, the end member last",
  "alignment-archives":
    "the alignment archives: one gzip stream with the fixed header, ustar, exactly the files of the rules, byte-equal to the pack",
  gzip: "every stored text object is one gzip member with the fixed header",
  manifest: "manifest.json lists exactly the files of the folder, with their size, SHA-256, and headers",
  "http-head": "every manifest object answers HEAD with 200, its headers, and its size as Content-Length",
  "http-cors": "every answer to a request with an Origin header has Access-Control-Allow-Origin: *",
  "http-range": "range reads of the first and the last cluster of each pack answer 206 with their bundles",
  "http-missing": "a path that does not exist answers 4xx",
} as const;

export type Rule = keyof typeof RULES;

/** Counts of a run, for the summary. */
export interface Counts {
  releases: number;
  datasets: number;
  clusters: number;
  objects: number;
  requests: number;
}

/**
 * Collector of violations: writes one line per violation to stderr, `<location>: <rule>: <message>`, and counts the
 * checks that could not run because an input they need failed.
 */
export class Report {
  violations = 0;
  skipped = 0;
  readonly counts: Counts = { releases: 0, datasets: 0, clusters: 0, objects: 0, requests: 0 };

  /** Report a violation of `rule` at a data path (or the data root for `""`). */
  violation(location: string, rule: Rule, message: string): void {
    this.violations += 1;
    console.error(`${location === "" ? "." : location}: ${rule}: ${oneLine(message)}`);
  }

  /** Count checks that could not run, because an input that they need failed its own check. */
  skip(count = 1): void {
    this.skipped += count;
  }
}

/** Return a message on one line, with a long found value cut. */
function oneLine(message: string): string {
  const line = message.replaceAll(/\s*[\r\n]+\s*/g, " ");
  return line.length > 600 ? `${line.slice(0, 600)}...` : line;
}

/** Return a found value for a message: JSON, cut to `limit` characters. */
export function found(value: unknown, limit = 120): string {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

/** Return bytes as space-separated hex digits. */
export function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
