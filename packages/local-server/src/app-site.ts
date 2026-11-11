/**
 * Routing and headers of the deployed app host, which the local app host copies and the app publish follows: the
 * viewer-request CloudFront Function of the infrastructure's site module serves `index.html` for every path whose last
 * segment has no `.`, and every object carries the `Cache-Control` of its folder.
 */

/** Content-Security-Policy of the header profile `site` of the host table (tofu/org-pangenome/site/site.json). */
export const SITE_CSP =
  "default-src 'self' *.pangenome.org; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.pangenome.org plausible.io maxcdn.bootstrapcdn.com; " +
  "style-src 'self' 'unsafe-inline' maxcdn.bootstrapcdn.com fonts.googleapis.com; " +
  "font-src 'self' maxcdn.bootstrapcdn.com fonts.googleapis.com fonts.gstatic.com; " +
  "img-src 'self' data:; " +
  "connect-src *; " +
  "frame-src 'self' player.vimeo.com";

/** The folder of one build, `static-<build id>/`: file names inside carry content hashes. */
export const STATIC_FOLDER_PATTERN = /^static-[0-9a-f]{12}$/;

/**
 * Return the `Cache-Control` of a file of `dist/`, by its path relative to `dist/`: the static folder is immutable;
 * images and fonts, whose names have no hash and which do not change, are kept for a day; the pages and other files at
 * the top are revalidated on every request, so a publish needs no cache clear.
 */
export function appCacheControl(path: string): string {
  const [top] = path.split("/");
  if (path.includes("/") && top !== undefined && STATIC_FOLDER_PATTERN.test(top)) {
    return "public, max-age=31536000, immutable";
  }
  if (top === "images" || top === "fonts") {
    return "public, max-age=86400";
  }
  return "public, max-age=0, must-revalidate";
}

/** Return whether the app host serves `index.html` for a path: the last segment of a page path has no `.`. */
export function isPagePath(path: string): boolean {
  const segments = path.split("/");
  const last = segments.at(-1) ?? "";
  return !last.includes(".");
}
