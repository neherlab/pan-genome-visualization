// Page dispatch of the one page shell: index.html serves every page path, and
// 404.html, the error page of the hosts, always shows the not-found part.
//
// Order: pick the page and import its module, which resolves once the module's
// stylesheets have loaded, while the index files that the page needs load; then
// insert its part, set the title and the navigation bar, and show the body. The
// body stays hidden until then, so nothing paints without its styles.

import { DATASET_ID_PATTERN } from "@panx/data-format";

import { DataError, findDataset, loadErrorAlert, loadIndex, loadReleases, pickRelease } from "./data";
import { keepReleaseInLinks, releaseParam } from "./links.js";

/** Page modules by page name; each exports `page` (see `showPage`). */
const pageModules = {
  home: () => import("./pages/home.js"),
  tutorial: () => import("./pages/tutorial.js"),
  pipeline: () => import("./pages/pipeline.js"),
  pathogens: () => import("./pages/pathogens.js"),
  dataset: () => import("./pages/dataset.js"),
  notFound: () => import("./pages/not-found.js"),
};

/** Pages of fixed paths, and whether they need the index of the shown release. */
const fixedPages = {
  "": { name: "home", needsIndex: true },
  tutorial: { name: "tutorial", needsIndex: false },
  pipeline: { name: "pipeline", needsIndex: false },
  pathogens: { name: "pathogens", needsIndex: true },
};

main().catch((error) => {
  console.error(error);
  showFailure(error);
});

async function main() {
  if (document.body.dataset.page === "not-found") {
    const { page } = await pageModules.notFound();
    setupShell(page);
    showBody();
    return;
  }
  const path = canonicalPath(window.location.pathname);
  if (path !== window.location.pathname) {
    window.history.replaceState(window.history.state, "", `${path}${window.location.search}${window.location.hash}`);
  }

  const route = parseRoute(path);
  if (route === undefined) {
    await showNotFound({ reason: "path" });
    return;
  }
  // A page without data still checks a `release` that the URL names, so a link to an unlisted release always gets
  // the not-found part.
  if (!route.needsIndex && releaseParam() === null) {
    await showPage(route.name, {});
    return;
  }

  // `showPage` imports the module again and gets this load; its error surfaces there.
  pageModules[route.name]().catch(() => {});
  let data;
  try {
    data = await loadShownRelease(route);
  } catch (error) {
    if (error instanceof DataError) {
      await showLoadError(error);
      return;
    }
    throw error;
  }
  if (data.notFound) {
    await showNotFound({ reason: data.notFound });
    return;
  }
  await showPage(route.name, data.context);
}

/** Return the path without a trailing `/` or `/index.html`, so `/Escherichia_coli/` becomes `/Escherichia_coli`. */
function canonicalPath(path) {
  const trimmed = path.replace(/\/index\.html$/, "/").replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Return the page of a canonical path, or `undefined` for a path that names no page. */
function parseRoute(path) {
  const segments = path.split("/").slice(1);
  if (segments.length !== 1) {
    return undefined;
  }
  const [segment] = segments;
  if (Object.hasOwn(fixedPages, segment)) {
    return fixedPages[segment];
  }
  if (DATASET_ID_PATTERN.test(segment)) {
    return { name: "dataset", needsIndex: true, datasetId: segment };
  }
  return undefined;
}

/** Load `releases.json` and the index of the shown release; return the page context, or why the page is not found. */
async function loadShownRelease(route) {
  const releases = await loadReleases();
  const shown = pickRelease(releases, releaseParam());
  if (shown.kind === "unlisted") {
    return { notFound: "release" };
  }
  if (!route.needsIndex) {
    return { context: { releases, release: shown.entry } };
  }
  const index = await loadIndex(shown.entry.id);
  const context = { releases, release: shown.entry, index };
  if (route.datasetId === undefined) {
    return { context };
  }
  const dataset = findDataset(index, route.datasetId);
  if (dataset === undefined) {
    return { notFound: "dataset" };
  }
  return { context: { ...context, dataset } };
}

/**
 * Show a page. Its module exports `page`: `title`, `nav` (`active` item, `brand` text), `html` (the
 * part), and `mount(context)`, which runs after the part is shown: context `releases`, `release` (the entry of the
 * shown release), `index`, and `dataset` (the index entry), as far as the page needs them.
 */
async function showPage(name, context) {
  const { page } = await pageModules[name]();
  const nodes = insertPart(page.html);
  setupShell(page);
  showBody();
  try {
    await page.mount(context);
  } catch (error) {
    if (!(error instanceof DataError)) {
      throw error;
    }
    for (const node of nodes) {
      node.remove();
    }
    insertAlert(error);
  }
}

/** Show the not-found part, with a link to the default release: the same path for an unlisted release, else home. */
async function showNotFound({ reason }) {
  const { page } = await pageModules.notFound();
  insertPart(page.html);
  setupShell(page);
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex";
  if (document.head.querySelector('meta[name="robots"]') === null) {
    document.head.append(robots);
  }
  const link = document.querySelector(".not-found-link a");
  if (reason === "release") {
    const url = new URL(window.location.href);
    url.searchParams.delete("release");
    link.href = `${url.pathname}${url.search}${url.hash}`;
    link.textContent = "Open this page with the current data";
  }
  showBody();
}

/** Show the alert of a failed load in the page area. */
async function showLoadError(error) {
  const { page } = await pageModules.notFound();
  setupShell(page);
  insertAlert(error);
  showBody();
}

/** Show an error when the page itself cannot load, such as a failed import of its module. */
function showFailure(error) {
  insertAlert(error);
  showBody();
}

/** Insert a page part before the footer, and return its top-level nodes. */
function insertPart(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes = [...template.content.childNodes];
  document.querySelector("footer").before(template.content);
  return nodes;
}

function insertAlert(error) {
  const container = document.createElement("div");
  container.className = "container";
  const row = document.createElement("div");
  row.className = "row";
  row.append(document.createElement("br"), document.createElement("br"), document.createElement("br"));
  const column = document.createElement("div");
  column.className = "col-md-8 col-md-offset-1";
  column.append(loadErrorAlert(error));
  row.append(column);
  container.append(row);
  document.querySelector("footer").before(container);
}

/** Set the title, the navigation bar of the page, the footer year, and the release of internal links. */
function setupShell(page) {
  document.title = page.title;
  const navbar = document.querySelector(".navbar-fixed-top");
  navbar.querySelector(".navbar-brand").textContent = ` ${page.nav.brand}`;
  for (const item of navbar.querySelectorAll("[data-nav]")) {
    item.classList.toggle("active", item.dataset.nav === page.nav.active);
  }
  for (const year of document.querySelectorAll(".footer-year")) {
    year.textContent = `- ${new Date().getFullYear()}`;
  }
  keepReleaseInLinks(document.body);
  window.jQuery?.(navbar).autoHidingNavbar();
}

/** Show the body, then scroll to the target of the URL fragment, which the browser looked for before the part existed. */
function showBody() {
  document.body.hidden = false;
  const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
  target?.scrollIntoView();
}
