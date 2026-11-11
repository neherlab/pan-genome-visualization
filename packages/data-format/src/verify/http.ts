/** The checks of a deployed data host: object headers, CORS, range reads of the packs, and missing paths. */

import { type ObjectHeaders, headersOfPath } from "../headers";
import { BundleError, type FetchRange, fetchRangeHttp, readBundle } from "../pack";
import type { Cluster, Clusters, DatasetEntry } from "../schemas";
import { errorMessage, found } from "./report";
import { type HttpSource, REQUEST_ORIGIN } from "./source";
import type { ReleaseContext, Verifier } from "./verifier";

/** A key of the layout's shape that no release holds, for the check of a missing path. */
const MISSING_OBJECT = "verify-data-missing-object.json";

export class HttpChecks {
  readonly source: HttpSource;
  readonly #verifier: Verifier;

  constructor(verifier: Verifier, source: HttpSource) {
    this.#verifier = verifier;
    this.source = source;
  }

  /**
   * Send `HEAD` with an `Origin` header and compare the answer with the headers of the path, with `size` as its
   * `Content-Length` when given. Return the status, or `undefined` when the request failed.
   */
  async checkHead(
    path: string,
    size: number | undefined,
    missingRule?: "dataset-files" | "read",
  ): Promise<number | undefined> {
    const expected = headersOfPath(path);
    let answer: { status: number; headers: Headers };
    try {
      answer = await this.source.request(path, { method: "HEAD", headers: { Origin: REQUEST_ORIGIN } }, (response) =>
        Promise.resolve({ status: response.status, headers: response.headers }),
      );
    } catch (error) {
      this.#verifier.violation(path, "http-head", errorMessage(error));
      return undefined;
    }
    const { status, headers } = answer;
    if (status === 404 && missingRule !== undefined) {
      this.#verifier.violation(path, missingRule, "the object answers 404");
      return status;
    }
    if (status !== 200) {
      this.#verifier.violation(path, "http-head", `HEAD answered ${status} in place of 200`);
      return status;
    }
    if (expected !== undefined) {
      for (const difference of headerDifferences(answerHeaders(headers), expected)) {
        this.#verifier.violation(path, "http-head", difference);
      }
    }
    const length = headers.get("Content-Length");
    if (size !== undefined && length !== String(size)) {
      this.#verifier.violation(path, "http-head", `Content-Length is ${found(length)}, the object has ${size} bytes`);
    }
    const origin = headers.get("Access-Control-Allow-Origin");
    if (origin !== "*") {
      this.#verifier.violation(path, "http-cors", `Access-Control-Allow-Origin is ${found(origin)} in place of "*"`);
    }
    return status;
  }

  /**
   * Check the objects of a release: `HEAD` of every object of the layout, every object of the manifest, and the
   * manifest itself, and a `GET` of a path that does not exist.
   */
  async checkRelease(
    release: ReleaseContext,
    expected: readonly string[],
    manifestSize: number | undefined,
  ): Promise<void> {
    const layout = new Set(expected);
    const paths = [...new Set([...expected, ...(release.manifest?.keys() ?? [])])];
    await Promise.all([
      this.checkHead(`${release.id}/manifest.json`, manifestSize),
      ...paths.map((path) => {
        const missingRule = !layout.has(path) ? undefined : path === "index.json" ? "read" : "dataset-files";
        return this.checkHead(`${release.id}/${path}`, release.manifest?.get(path)?.size, missingRule);
      }),
      this.#checkMissing(`${release.id}/${MISSING_OBJECT}`),
    ]);
  }

  /** Read the bundles of the first and the last cluster of a dataset's pack with range requests. */
  async checkRanges(release: ReleaseContext, dataset: DatasetEntry, clusters: Clusters | undefined): Promise<void> {
    if (clusters === undefined) {
      this.#verifier.report.skip();
      return;
    }
    const path = `${release.id}/${dataset.id}/gene_clusters.tar.gz`;
    const read = fetchRangeHttp(this.source.url(path));
    const fetchRange: FetchRange = (range, signal) => this.source.limiter.run(() => read(range, signal));
    const ends = [clusters.clusters[0], clusters.clusters.at(-1)].filter((cluster) => cluster !== undefined);
    const reads: Cluster[] = [...new Set(ends)];
    await Promise.all(
      reads.map(async (cluster) => {
        try {
          await readBundle(fetchRange, cluster, { dataset: dataset.id });
        } catch (error) {
          const message =
            error instanceof BundleError ? error.message : `cluster ${cluster.id}: ${errorMessage(error)}`;
          this.#verifier.violation(path, "http-range", message);
        }
      }),
    );
  }

  async #checkMissing(path: string): Promise<void> {
    try {
      const status = await this.source.request(path, { headers: { Origin: REQUEST_ORIGIN } }, async (response) => {
        await response.body?.cancel();
        return response.status;
      });
      if (status < 400 || status > 499) {
        this.#verifier.violation(path, "http-missing", `a path that does not exist answered ${status} in place of 4xx`);
      }
    } catch (error) {
      this.#verifier.violation(path, "http-missing", errorMessage(error));
    }
  }
}

/** Values of the object headers, `null` for an absent header. */
type HeaderValues = { readonly [K in keyof ObjectHeaders]: string | null };

/** Return a message for each header of a manifest entry or an answer that differs from the headers of its path. */
export function headerDifferences(actual: HeaderValues, expected: ObjectHeaders): string[] {
  const fields = ["contentType", "contentEncoding", "cacheControl", "contentDisposition"] as const;
  return fields
    .filter((field) => actual[field] !== expected[field])
    .map((field) => `${field} is ${found(actual[field])}, the format gives ${found(expected[field])}`);
}

/** Return the object headers of an answer. */
function answerHeaders(headers: Headers): HeaderValues {
  return {
    contentType: headers.get("Content-Type"),
    contentEncoding: headers.get("Content-Encoding"),
    cacheControl: headers.get("Cache-Control"),
    contentDisposition: headers.get("Content-Disposition"),
  };
}
