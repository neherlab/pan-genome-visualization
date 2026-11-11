// Internal links of the app. Pages are reached under several paths and with
// `?release=`, so every internal link is absolute and keeps the release of the
// shown page.

/** Return the `release` query parameter of the page, or null. */
export function releaseParam() {
  return new URLSearchParams(window.location.search).get("release");
}

/** Return an absolute app path, such as `/S_pneumoniae616`, with the `release` of the page. */
export function pagePath(path) {
  const url = new URL(path, window.location.origin);
  const release = releaseParam();
  if (release !== null) {
    url.searchParams.set("release", release);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Add the `release` of the page to every internal link below a root, such as `/tutorial` or `/#downloads`. */
export function keepReleaseInLinks(root) {
  if (releaseParam() === null) {
    return;
  }
  for (const link of root.querySelectorAll('a[href^="/"]:not([href^="//"])')) {
    link.setAttribute("href", pagePath(link.getAttribute("href")));
  }
}
