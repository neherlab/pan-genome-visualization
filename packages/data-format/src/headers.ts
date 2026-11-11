/**
 * Object headers of format 1 (docs/data-format.md, "S3 object metadata and bucket settings"): the one source of
 * the headers in this repository. Each `manifest.json` lists the headers of every object of its release.
 */

import { type DataObject, type DatasetFile, parseDataPath } from "./paths";

/** HTTP headers of one stored object, with the field names of `manifest.json`. */
export interface ObjectHeaders {
  readonly contentType: string;
  readonly contentEncoding: "gzip" | null;
  readonly cacheControl: string;
  readonly contentDisposition: string | null;
}

/** `releases.json` changes, so caches keep it for 5 minutes; every other object is immutable. */
const CACHE_RELEASES = "public, max-age=300";
const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

interface HeaderRule {
  readonly contentType: string;
  readonly contentEncoding: "gzip" | null;
  /** Whether browsers save the object as `<dataset>_<file name>`. */
  readonly download: boolean;
}

const JSON_RULE: HeaderRule = { contentType: "application/json", contentEncoding: "gzip", download: false };
const ARCHIVE_RULE: HeaderRule = { contentType: "application/gzip", contentEncoding: null, download: true };

const DATASET_FILE_RULES: Readonly<Record<DatasetFile, HeaderRule>> = {
  "dataset.json": JSON_RULE,
  "clusters.json": JSON_RULE,
  "loci.json": JSON_RULE,
  "gene_clusters.tar.gz": ARCHIVE_RULE,
  "core_gene_alignments.tar.gz": ARCHIVE_RULE,
  "all_gene_alignments.tar.gz": ARCHIVE_RULE,
  "strain_tree.nwk": { contentType: "text/plain; charset=utf-8", contentEncoding: "gzip", download: true },
  "metadata.tsv": { contentType: "text/tab-separated-values; charset=utf-8", contentEncoding: "gzip", download: true },
};

/** Return the headers of an object of the layout. */
export function headersOf(object: DataObject): ObjectHeaders {
  switch (object.kind) {
    case "releases":
      return { ...withoutDownload(JSON_RULE), cacheControl: CACHE_RELEASES, contentDisposition: null };
    case "release":
      return { ...withoutDownload(JSON_RULE), cacheControl: CACHE_IMMUTABLE, contentDisposition: null };
    case "dataset": {
      const rule = DATASET_FILE_RULES[object.file];
      return {
        ...withoutDownload(rule),
        cacheControl: CACHE_IMMUTABLE,
        contentDisposition: rule.download ? `attachment; filename="${object.dataset}_${object.file}"` : null,
      };
    }
  }
}

/** Return the headers of the object at a data path, or `undefined` when the path is outside the layout. */
export function headersOfPath(path: string): ObjectHeaders | undefined {
  const object = parseDataPath(path);
  return object === undefined ? undefined : headersOf(object);
}

function withoutDownload({
  contentType,
  contentEncoding,
}: HeaderRule): Pick<ObjectHeaders, "contentType" | "contentEncoding"> {
  return { contentType, contentEncoding };
}
