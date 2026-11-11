// The viewer context: the data of the shown page, which the page module sets
// before it imports the viewer modules. The viewer modules read it at import
// time, so it never changes after that.

import { dataPath } from "@panx/data-format";

import { BundleReader, dataFileUrl, dataRoot, metaDetailsOf, metaDisplayOf, tipAttributesOf } from "../data";
import { pagePath } from "../links.js";

export { dataRoot };

/** The entry of the shown release in `releases.json`. */
export let release;
/** Id of the shown dataset, or null on pages without a dataset. */
export let datasetId = null;
/** The datasets of the shown release, in display order (`index.json`). */
export let datasets = [];
/** The dataset groups of the shown release, in display order (`index.json`). */
export let categories = [];
/** The parsed `dataset.json` of the shown dataset. */
export let dataset;
/** The clusters of `clusters.json` of the shown dataset. */
export let clusters = [];
/** The metadata columns in the shape of the old `meta_display`: `meta_display_order` and `color_options`. */
export let metaDisplay = { meta_display_order: [], color_options: {} };
/** The values of each colour column, in the shape of the old `meta_details`. */
export let metaDetails = {};
/** The extra columns of the cluster table (`cluster_columns` of `dataset.json`). */
export let clusterColumns = [];
/** The bundle reader of the shown dataset. */
export let bundles;

/** Set the context of a page: the release and its index, and on the dataset page `dataset.json` and `clusters.json`. */
export function setViewerContext(files) {
  release = files.release;
  datasets = files.index.datasets;
  categories = files.index.categories;
  if (files.dataset === undefined) {
    return;
  }
  dataset = files.dataset;
  datasetId = dataset.id;
  clusters = files.clusters.clusters;
  metaDisplay = metaDisplayOf(dataset);
  metaDetails = metaDetailsOf(dataset);
  clusterColumns = dataset.cluster_columns;
  bundles = new BundleReader(release.id, datasetId);
}

/** Return the URL of a file of a dataset of the shown release; the shown dataset by default. */
export function datasetFileUrl(file, id = datasetId) {
  return dataFileUrl(dataPath({ kind: "dataset", release: release.id, dataset: id, file }));
}

/** Return the app path of a dataset page, with the release of the shown page. */
export function datasetPagePath(id) {
  return pagePath(`/${id}`);
}

/** Return the strain tree of the shown dataset, with each tip's `attr` filled from its strain (a fresh copy). */
export function strainTree() {
  const strains = new Map(dataset.strains.map((strain) => [strain.accession, strain]));
  const copy = (node) => {
    if (node.children !== undefined) {
      return { name: node.name, branch_length: node.branch_length, children: node.children.map(copy) };
    }
    return { name: node.name, branch_length: node.branch_length, attr: tipAttributesOf(strains.get(node.name), dataset) };
  };
  return copy(dataset.strain_tree);
}

/** Return the URL of an accession by the `accession_url` template of the shown dataset, or null when it has none. */
export function accessionUrl(accession) {
  const template = dataset.accession_url;
  return template === null ? null : template.replaceAll("{accession}", encodeURIComponent(accession));
}
