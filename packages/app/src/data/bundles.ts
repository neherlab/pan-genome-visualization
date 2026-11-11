/**
 * Bundle reads of the dataset page: the files of one cluster, read from the pack of the shown release with one range
 * request, with a cache of the last bundles and one running read at a time.
 */

import {
  type Bundle,
  type BundleCluster,
  BundleError,
  dataPath,
  type FetchRange,
  fetchRangeHttp,
  readBundle,
} from "@panx/data-format";

import { dataFileUrl } from "./files";

/** The number of bundles that a reader keeps. */
const CACHED_BUNDLES = 50;

/** The text of the alignment panel when the browser cannot read clusters (data format, "Browser floor"). */
const UNSUPPORTED_TEXT =
  "Gene clusters need Chrome or Edge 107, Firefox 117, or Safari 16.4 or newer, and a working connection.";

/** Reader of the bundles of one dataset of one release. */
export class BundleReader {
  readonly #dataset: string;
  readonly #fetchRange: FetchRange;
  readonly #bundles = new Map<string, Bundle>();
  #running: AbortController | undefined;

  constructor(release: string, dataset: string) {
    this.#dataset = dataset;
    this.#fetchRange = fetchRangeHttp(
      dataFileUrl(dataPath({ kind: "dataset", release, dataset, file: "gene_clusters.tar.gz" })),
    );
  }

  /**
   * Return the bundle of a cluster. A read aborts the read that is still running, which then resolves to `undefined`;
   * a failed read throws `BundleError`.
   */
  async read(cluster: BundleCluster): Promise<Bundle | undefined> {
    this.#running?.abort();
    const cached = this.#bundles.get(cluster.id);
    if (cached !== undefined) {
      this.#bundles.delete(cluster.id);
      this.#bundles.set(cluster.id, cached);
      return cached;
    }
    const running = new AbortController();
    this.#running = running;
    try {
      const bundle = await readBundle(this.#fetchRange, cluster, { dataset: this.#dataset, signal: running.signal });
      this.#keep(cluster.id, bundle);
      return running.signal.aborted ? undefined : bundle;
    } catch (error) {
      if (running.signal.aborted) {
        return undefined;
      }
      throw error;
    } finally {
      if (this.#running === running) {
        this.#running = undefined;
      }
    }
  }

  #keep(id: string, bundle: Bundle): void {
    this.#bundles.set(id, bundle);
    for (const oldest of this.#bundles.keys()) {
      if (this.#bundles.size <= CACHED_BUNDLES) {
        break;
      }
      this.#bundles.delete(oldest);
    }
  }
}

/** Return the text of the alignment panel for a failed bundle read; it names the cluster id. */
export function bundleErrorText(error: unknown): string {
  if (!(error instanceof BundleError)) {
    return `The cluster failed to load: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (error.reason === "unsupported" || error.reason === "network") {
    return `Cluster ${error.clusterId} cannot load. ${UNSUPPORTED_TEXT}`;
  }
  return `The cluster failed to load: ${error.message}`;
}
