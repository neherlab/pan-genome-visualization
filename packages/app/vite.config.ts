import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { defineConfig, loadEnv, type Plugin } from "vite";

const appDir = import.meta.dirname;
const rootDir = resolve(appDir, "../..");

// Inputs of a build, relative to the repository root: the same inputs give the
// same build id, and so the same static folder name.
const buildInputs = [
  "packages/app/src",
  "packages/app/public",
  "packages/app/index.html",
  "packages/app/404.html",
  "packages/app/vite.config.ts",
  "packages/app/package.json",
  "packages/data-format/src",
  "bun.lock",
  "patches",
];

// Browser floor: the earliest versions with single-range CORS requests without
// preflight and DecompressionStream("gzip") (docs/data-format.md).
const browserTargets = ["chrome107", "edge107", "firefox117", "safari16.4"];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appDir, "VITE_");
  const dataUrl = parseDataUrl(env["VITE_DATA_URL"]);
  const plausibleDomain = env["VITE_PLAUSIBLE_DOMAIN"] ?? "";
  const viteEnv = { VITE_DATA_URL: dataUrl, VITE_PLAUSIBLE_DOMAIN: plausibleDomain };

  return {
    root: appDir,
    base: "/",
    envDir: appDir,
    define: {
      "import.meta.env.VITE_DATA_URL": JSON.stringify(dataUrl),
    },
    resolve: {
      // dc 2 requires crossfilter2, a second copy of crossfilter 1 beside the app's.
      alias: { crossfilter2: "crossfilter" },
    },
    plugins: [shellIncludes(), dataPreconnect(dataUrl), plausible(plausibleDomain)],
    build: {
      target: browserTargets,
      outDir: "dist",
      emptyOutDir: true,
      assetsDir: `static-${buildId(viteEnv)}`,
      // The alignment viewer msa-niaid.js alone is about 450 kB.
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        input: {
          index: join(appDir, "index.html"),
          404: join(appDir, "404.html"),
        },
      },
    },
  };
});

/** Return the data root URL without a trailing slash; throw when it is missing or not an http(s) URL. */
function parseDataUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("VITE_DATA_URL is not set: give the URL of the data root, such as https://data.pangenome.org");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`VITE_DATA_URL is not a URL: ${value}`, { cause: error });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`VITE_DATA_URL must be an http or https URL: ${value}`);
  }
  if (url.search || url.hash) {
    throw new Error(`VITE_DATA_URL must have no query or fragment: ${value}`);
  }
  return url.href.replace(/\/+$/, "");
}

/** Return the first 12 hex digits of SHA-256 over the sorted input paths, their contents, and the VITE_* values. */
function buildId(viteEnv: Record<string, string>): string {
  const hash = createHash("sha256");
  for (const path of buildInputs.flatMap((input) => listFiles(join(rootDir, input))).toSorted()) {
    hash.update(`${relative(rootDir, path)}\0`);
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  for (const [key, value] of Object.entries(viteEnv).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    hash.update(`${key}=${value}\0`);
  }
  return hash.digest("hex").slice(0, 12);
}

/** List the files below a path, or the path itself when it is a file. */
function listFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) {
    return [path];
  }
  return readdirSync(path, { recursive: true, encoding: "utf8" })
    .map((entry) => join(path, entry))
    .filter((entry) => statSync(entry).isFile());
}

/**
 * Replace each `<!-- include <path> -->` of a page with the content of that file, a path relative to this folder, so
 * that index.html and 404.html share one navigation bar and one footer.
 */
function shellIncludes(): Plugin {
  return {
    name: "panx-shell-includes",
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html.replace(/^([ \t]*)<!-- include (\S+) -->$/gm, (_match, indent: string, path: string) =>
          readFileSync(join(appDir, path), "utf8")
            .trimEnd()
            .replace(/^(?=.)/gm, indent),
        ),
    },
  };
}

/** Open the connection to the data host while the page script loads, for the CORS requests of the data files. */
function dataPreconnect(dataUrl: string): Plugin {
  return {
    name: "panx-data-preconnect",
    transformIndexHtml() {
      return [
        {
          tag: "link",
          attrs: { rel: "preconnect", href: new URL(dataUrl).origin, crossorigin: true },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

/** Add the Plausible tag to every page when a domain is set. */
function plausible(domain: string): Plugin {
  return {
    name: "panx-plausible",
    transformIndexHtml() {
      if (!domain) {
        return [];
      }
      return [
        {
          tag: "script",
          attrs: {
            id: "plausible",
            defer: true,
            "data-domain": domain,
            src: "https://plausible.io/js/script.hash.outbound-links.file-downloads.compat.js",
          },
          injectTo: "head",
        },
      ];
    },
  };
}
