/** The index and dataset files of the data root that the pages load, and the choice of the shown release. */

import {
  Clusters,
  Dataset,
  dataPath,
  Loci,
  dataUrl,
  ReleaseIndex,
  Releases,
  type DatasetEntry,
  type ReleaseEntry,
} from "@panx/data-format";

import { DataError, jsonLoader } from "./load";

/** URL of the data root, without a trailing slash (`VITE_DATA_URL` of the build). */
export const dataRoot: string = import.meta.env.VITE_DATA_URL;

const releasesLoader = jsonLoader(Releases);
const indexLoader = jsonLoader(ReleaseIndex);
const datasetLoader = jsonLoader(Dataset);
const clustersLoader = jsonLoader(Clusters);
const lociLoader = jsonLoader(Loci);

/** Return the URL of a data path under the data root. */
export function dataFileUrl(path: string): string {
  return dataUrl(dataRoot, path);
}

/** Load `releases.json`. */
export function loadReleases(): Promise<Releases> {
  return releasesLoader(dataFileUrl(dataPath({ kind: "releases" })));
}

/** Load the `index.json` of a release, and check that it names that release. */
export async function loadIndex(release: string): Promise<ReleaseIndex> {
  const url = dataFileUrl(dataPath({ kind: "release", release, file: "index.json" }));
  const index = await indexLoader(url);
  if (index.release !== release) {
    throw new DataError(url, { kind: "schema", message: `names release "${index.release}" in place of "${release}"` });
  }
  return index;
}

/** Load the `dataset.json` of a dataset, and check that it names that dataset. */
export async function loadDataset(release: string, dataset: string): Promise<Dataset> {
  const url = dataFileUrl(dataPath({ kind: "dataset", release, dataset, file: "dataset.json" }));
  const file = await datasetLoader(url);
  if (file.id !== dataset) {
    throw new DataError(url, { kind: "schema", message: `names dataset "${file.id}" in place of "${dataset}"` });
  }
  return file;
}

/** Load the `clusters.json` of a dataset. */
export function loadClusters(release: string, dataset: string): Promise<Clusters> {
  return clustersLoader(dataFileUrl(dataPath({ kind: "dataset", release, dataset, file: "clusters.json" })));
}

/** Load the `loci.json` of a dataset, and check that it lists the genes of each of its `clusters` clusters. */
export async function loadLoci(release: string, dataset: string, clusters: number): Promise<Loci> {
  const url = dataFileUrl(dataPath({ kind: "dataset", release, dataset, file: "loci.json" }));
  const file = await lociLoader(url);
  if (file.loci.length !== clusters) {
    throw new DataError(url, {
      kind: "schema",
      message: `lists the genes of ${file.loci.length} clusters in place of ${clusters}`,
    });
  }
  return file;
}

/** The release that a page shows. */
export type ShownRelease =
  | { readonly kind: "listed"; readonly entry: ReleaseEntry; readonly isDefault: boolean }
  | { readonly kind: "unlisted"; readonly id: string };

/** Pick the release of the `release` query parameter, or the default release when the parameter is absent. */
export function pickRelease(releases: Releases, requested: string | null): ShownRelease {
  const id = requested ?? releases.default;
  const entry = releases.releases.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    return { kind: "unlisted", id };
  }
  return { kind: "listed", entry, isDefault: id === releases.default };
}

/** Return the entry of a dataset in a release index, or `undefined` when the release lacks it. */
export function findDataset(index: ReleaseIndex, id: string): DatasetEntry | undefined {
  return index.datasets.find((dataset) => dataset.id === id);
}
