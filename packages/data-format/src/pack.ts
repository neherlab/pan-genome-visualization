/**
 * Readers of `gene_clusters.tar.gz`, the pack of a dataset: one gzip member per cluster, read with one HTTP range
 * request (docs/data-format.md, "gene_clusters.tar.gz").
 */

import type { z } from "zod";

import { type Cluster, GeneTree, Patterns } from "./schemas";
import { type UstarEntry, parseUstar } from "./ustar";

const UTF8 = new TextDecoder("utf-8", { fatal: true });

/** Inclusive byte range `[first, last]`. */
export type ByteRange = readonly [first: number, last: number];

/** Return the bytes of a range of the pack; reject with `signal.reason` once the signal aborts. */
export type FetchRange = (range: ByteRange, signal?: AbortSignal) => Promise<Uint8Array<ArrayBuffer>>;

/**
 * Why a range read failed: `network` when `fetch` rejected (a network failure, or a CORS preflight that the data
 * host refuses), `status` for an answer other than 206, `length` for a body of the wrong length.
 */
export type RangeFailure = "network" | "status" | "length";

/** A failed range read of `fetchRangeHttp`. */
export class RangeFetchError extends Error {
  override readonly name = "RangeFetchError";
  readonly reason: RangeFailure;
  readonly url: string;
  readonly range: ByteRange;

  constructor(reason: RangeFailure, url: string, range: ByteRange, message: string, options?: ErrorOptions) {
    super(`${message}: bytes ${range[0]}-${range[1]} of ${url}`, options);
    this.reason = reason;
    this.url = url;
    this.range = range;
  }
}

/**
 * Return a `FetchRange` that reads ranges of `url` with `fetch`. Each request has a single `Range` header and no
 * other header of its own, so browsers send it without CORS preflight. The read accepts only a 206 answer with
 * exactly the bytes of the range, and cancels the body of every other answer.
 */
export function fetchRangeHttp(url: string): FetchRange {
  return async (range, signal) => {
    const [first, last] = range;
    const expected = last - first + 1;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Range: `bytes=${first}-${last}` },
        credentials: "omit",
        ...(signal === undefined ? {} : { signal }),
      });
    } catch (error) {
      if (signal?.aborted === true || !(error instanceof TypeError)) {
        throw error;
      }
      throw new RangeFetchError("network", url, range, `request failed (${error.message})`, { cause: error });
    }
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new RangeFetchError("status", url, range, `HTTP ${response.status} in place of 206`);
    }
    if (response.body === null) {
      throw new RangeFetchError("length", url, range, `empty body in place of ${expected} bytes`);
    }
    return readExactly(response.body, expected, (received) => {
      const message = `body of ${received}${received > expected ? " or more" : ""} bytes in place of ${expected}`;
      return new RangeFetchError("length", url, range, message);
    });
  };
}

/** Read a stream that must hold exactly `expected` bytes; cancel it as soon as it holds more. */
async function readExactly(
  body: ReadableStream<Uint8Array>,
  expected: number,
  wrongLength: (received: number) => Error,
): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = new Uint8Array(expected);
  let received = 0;
  const reader = body.getReader();
  // A stream reader yields its chunks one after another, and the browsers of the format have no async iteration of
  // `ReadableStream`.
  // oxlint-disable no-await-in-loop
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    if (received + chunk.value.length > expected) {
      await reader.cancel();
      throw wrongLength(received + chunk.value.length);
    }
    bytes.set(chunk.value, received);
    received += chunk.value.length;
  }
  // oxlint-enable no-await-in-loop
  if (received !== expected) {
    throw wrongLength(received);
  }
  return bytes;
}

/** The files of one cluster, read from the pack. */
export type Bundle = BundleShared & (ProteinParts | { readonly kind: "rna" });

interface BundleShared {
  readonly naAln: string;
  readonly naAlnReduced: string;
  readonly patterns: Patterns;
  readonly tree?: GeneTree;
  readonly nwk?: string;
}

interface ProteinParts {
  readonly kind: "protein";
  readonly aaAln: string;
  readonly aaAlnReduced: string;
}

type BundlePart = "aaAln" | "aaAlnReduced" | "naAln" | "naAlnReduced" | "tree" | "nwk" | "patterns";

/** When a part is in a member: in `protein` clusters only, in every cluster, or when the pipeline wrote it. */
type Presence = "protein" | "always" | "optional";

/** The entries of a cluster member, in their order in the member. */
export const BUNDLE_PARTS: readonly {
  readonly part: BundlePart;
  readonly suffix: string;
  readonly presence: Presence;
}[] = [
  { part: "aaAln", suffix: "_aa_aln.fa", presence: "protein" },
  { part: "aaAlnReduced", suffix: "_aa_aln_reduced.fa", presence: "protein" },
  { part: "naAln", suffix: "_na_aln.fa", presence: "always" },
  { part: "naAlnReduced", suffix: "_na_aln_reduced.fa", presence: "always" },
  { part: "tree", suffix: "_tree.json", presence: "optional" },
  { part: "nwk", suffix: ".nwk", presence: "optional" },
  { part: "patterns", suffix: "_patterns.json", presence: "always" },
];

/**
 * Why a bundle read failed: `unsupported` when the runtime has no `DecompressionStream`, a `RangeFailure` of the
 * range read, `fetch` for another error of a `FetchRange`, `gzip` when the bytes are no complete gzip stream, `tar`
 * when they hold no valid ustar entries, `entries` for missing, extra, or misordered entries, and `content` for a
 * file that is not UTF-8 or fails its schema.
 */
export type BundleFailure = "unsupported" | RangeFailure | "fetch" | "gzip" | "tar" | "entries" | "content";

/** A failed read of the bundle of one cluster; the message names the cluster id. */
export class BundleError extends Error {
  override readonly name = "BundleError";
  readonly reason: BundleFailure;
  readonly clusterId: string;

  constructor(reason: BundleFailure, clusterId: string, message: string, options?: ErrorOptions) {
    super(`cluster ${clusterId}: ${message}`, options);
    this.reason = reason;
    this.clusterId = clusterId;
  }
}

/** The fields of a `clusters.json` entry that a bundle read needs. */
export type BundleCluster = Pick<Cluster, "id" | "kind" | "range">;

/**
 * Read the files of one cluster from the pack of a dataset: fetch the cluster's range, decompress it with
 * `DecompressionStream("gzip")`, parse its ustar entries, and check their names, order, and contents. Throw
 * `BundleError` on every fault; an abort of `signal` rejects with `signal.reason` instead.
 */
export async function readBundle(
  fetchRange: FetchRange,
  cluster: BundleCluster,
  options: { readonly dataset: string; readonly signal?: AbortSignal },
): Promise<Bundle> {
  const { id, range } = cluster;
  const { signal } = options;
  if (typeof DecompressionStream === "undefined") {
    throw new BundleError("unsupported", id, "this browser has no DecompressionStream");
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await fetchRange(range, signal);
  } catch (error) {
    if (signal?.aborted === true) {
      throw signal.reason;
    }
    const reason = error instanceof RangeFetchError ? error.reason : "fetch";
    throw new BundleError(reason, id, errorMessage(error), { cause: error });
  }
  const expected = range[1] - range[0] + 1;
  if (bytes.length !== expected) {
    throw new BundleError("length", id, `range read gave ${bytes.length} bytes in place of ${expected}`);
  }
  let member: Uint8Array;
  try {
    member = await gunzip(bytes);
  } catch (error) {
    throw new BundleError("gzip", id, `range is no complete gzip member (${errorMessage(error)})`, { cause: error });
  }
  return bundleFromMember(member, cluster, options.dataset);
}

/** Decompress one complete gzip stream with `DecompressionStream("gzip")`; reject on any fault of the stream. */
export async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Return the bundle of a decompressed cluster member: ustar entries `<dataset>/geneCluster/<id><suffix>` in the
 * order of `BUNDLE_PARTS`, with every part that the cluster's kind needs and no other entry or end marker.
 */
export function bundleFromMember(member: Uint8Array, cluster: BundleCluster, dataset: string): Bundle {
  const { id, kind } = cluster;
  let entries: readonly UstarEntry[];
  try {
    const archive = parseUstar(member);
    if (archive.endOffset !== null) {
      throw new Error(`tar end marker at byte ${archive.endOffset} of the member`);
    }
    entries = archive.entries;
  } catch (error) {
    throw new BundleError("tar", id, errorMessage(error), { cause: error });
  }

  const directory = `${dataset}/geneCluster/`;
  const files = new Map<BundlePart, Uint8Array>();
  let previous = -1;
  for (const entry of entries) {
    const index = BUNDLE_PARTS.findIndex(
      ({ suffix, presence }) =>
        entry.name === `${directory}${id}${suffix}` && (presence !== "protein" || kind === "protein"),
    );
    const spec = BUNDLE_PARTS[index];
    if (spec === undefined) {
      throw new BundleError("entries", id, `extra entry "${entry.name}" in a ${kind} cluster`);
    }
    if (index <= previous) {
      throw new BundleError("entries", id, `entry "${entry.name}" is out of order`);
    }
    previous = index;
    files.set(spec.part, entry.data);
  }
  for (const { part, suffix, presence } of BUNDLE_PARTS) {
    if (!files.has(part) && (presence === "always" || (presence === "protein" && kind === "protein"))) {
      throw new BundleError("entries", id, `missing entry "${directory}${id}${suffix}"`);
    }
  }

  const textOf = (part: BundlePart): string | undefined => {
    const data = files.get(part);
    if (data === undefined) {
      return undefined;
    }
    try {
      return UTF8.decode(data);
    } catch (error) {
      throw new BundleError("content", id, `${part} is not UTF-8`, { cause: error });
    }
  };
  const required = (part: BundlePart): string => {
    const value = textOf(part);
    if (value === undefined) {
      throw new BundleError("entries", id, `missing ${part}`);
    }
    return value;
  };
  const jsonOf = <T>(part: BundlePart, schema: z.ZodType<T>, value: string): T => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new BundleError("content", id, `${part} is not JSON (${errorMessage(error)})`, { cause: error });
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new BundleError("content", id, `${part} fails its schema: ${result.error.message}`, {
        cause: result.error,
      });
    }
    return result.data;
  };

  const treeText = textOf("tree");
  const nwk = textOf("nwk");
  const shared: BundleShared = {
    naAln: required("naAln"),
    naAlnReduced: required("naAlnReduced"),
    patterns: jsonOf("patterns", Patterns, required("patterns")),
    ...(treeText === undefined ? {} : { tree: jsonOf("tree", GeneTree, treeText) }),
    ...(nwk === undefined ? {} : { nwk }),
  };
  return kind === "protein"
    ? { ...shared, kind, aaAln: required("aaAln"), aaAlnReduced: required("aaAlnReduced") }
    : { ...shared, kind };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
