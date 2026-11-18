/** Data paths and their URLs under a data root (docs/data-format.md, "Layout of the data root"). */

/** Release id: the UTC creation time in ISO 8601 basic format, such as `20261112T080000Z`. */
export const RELEASE_ID_PATTERN = /^\d{8}T\d{6}Z$/;

/** Page names of the app, which no dataset id may take. */
export const APP_PAGE_NAMES = ["tutorial", "pipeline", "pathogens", "index"] as const;

/** Dataset id: an ASCII letter, then letters, digits, and `_`, never a page name of the app. */
export const DATASET_ID_PATTERN = new RegExp(`^(?!(?:${APP_PAGE_NAMES.join("|")})$)[A-Za-z][A-Za-z0-9_]*$`);

/** Cluster id: ASCII letters, digits, and `_`. */
export const CLUSTER_ID_PATTERN = /^[A-Za-z0-9_]+$/;

export const RELEASES_FILE = "releases.json";

/** Files of a release folder beside the dataset folders. */
export const RELEASE_FILES = ["index.json", "manifest.json"] as const;
export type ReleaseFile = (typeof RELEASE_FILES)[number];

/** The 8 files of a dataset folder. */
export const DATASET_FILES = [
  "dataset.json",
  "clusters.json",
  "loci.json",
  "gene_clusters.tar.gz",
  "core_gene_alignments.tar.gz",
  "all_gene_alignments.tar.gz",
  "strain_tree.nwk",
  "metadata.tsv",
] as const;
export type DatasetFile = (typeof DATASET_FILES)[number];

/** An object of the data root, identified by its data path. */
export type DataObject =
  | { readonly kind: "releases" }
  | { readonly kind: "release"; readonly release: string; readonly file: ReleaseFile }
  | { readonly kind: "dataset"; readonly release: string; readonly dataset: string; readonly file: DatasetFile };

const KEY_SEGMENT = /^[A-Za-z0-9_.-]+$/;

/**
 * Return whether a path follows the key rules: segments of ASCII letters, digits, `_`, `-`, and `.`,
 * separated by `/`, with no empty, `.`, or `..` segment.
 */
export function isDataKey(path: string): boolean {
  return path.split("/").every((segment) => KEY_SEGMENT.test(segment) && segment !== "." && segment !== "..");
}

/** Return the data path of `releases.json`, a file of a release folder, or a file of a dataset folder. */
export function dataPath(object: DataObject): string {
  switch (object.kind) {
    case "releases":
      return RELEASES_FILE;
    case "release":
      return `${object.release}/${object.file}`;
    case "dataset":
      return `${object.release}/${object.dataset}/${object.file}`;
  }
}

function isMember<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((member) => member === value);
}

/** Parse a data path into the object of the layout that it names, or return `undefined` for any other path. */
export function parseDataPath(path: string): DataObject | undefined {
  const segments = path.split("/");
  const [first, second, third] = segments;
  if (segments.length === 1 && first === RELEASES_FILE) {
    return { kind: "releases" };
  }
  if (first === undefined || second === undefined || !RELEASE_ID_PATTERN.test(first)) {
    return undefined;
  }
  if (segments.length === 2 && isMember(RELEASE_FILES, second)) {
    return { kind: "release", release: first, file: second };
  }
  if (
    segments.length === 3 &&
    third !== undefined &&
    DATASET_ID_PATTERN.test(second) &&
    isMember(DATASET_FILES, third)
  ) {
    return { kind: "dataset", release: first, dataset: second, file: third };
  }
  return undefined;
}

/** Return the URL of a data path under a data root such as `https://data.pangenome.org`. */
export function dataUrl(root: string, path: string): string {
  return new URL(path, root.endsWith("/") ? root : `${root}/`).href;
}
