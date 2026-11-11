import "../js/libs.js";
import "./dataset.css";
import "../vendor/pace.min.js";

import { loadClusters, loadDataset } from "../data";
import { setViewerContext } from "../js/context.js";
import html from "./dataset.html?raw";
import { NAV } from "./nav.js";

export const page = {
  title: "panX",
  nav: NAV,
  html,
  /** Load the files of the dataset, then start the viewer on them. */
  async mount({ releases, release, index, dataset: entry }) {
    bindTreeSearch("#searchAccession-group input", "search_accession");
    bindTreeSearch("#searchAnnotation-group input", "search_annotation");
    const [dataset, clusters] = await Promise.all([loadDataset(release.id, entry.id), loadClusters(release.id, entry.id)]);
    await startViewer({ releases, release, index, entry, dataset, clusters });
  },
};

/** Start the viewer on the files of the shown dataset: the index files, `dataset.json`, and `clusters.json`. */
async function startViewer(files) {
  setViewerContext(files);
  await import("../js/render_viewer.js");
}

/** Call the gene-tree search of the viewer, a function on window, with the text of a search field. */
function bindTreeSearch(selector, handler) {
  const input = document.querySelector(selector);
  input.addEventListener("input", () => window[handler](input.value));
}
