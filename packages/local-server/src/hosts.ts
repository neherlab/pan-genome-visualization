/**
 * Request handlers of the local app host and the local data host. Both copy the deployed hosts: only `GET` and `HEAD`
 * (403 for other methods, so a CORS preflight fails as it does on CloudFront), and a request path maps to a file only
 * when it follows the key rules of the data format, inside the served folder. Any website can send requests to
 * 127.0.0.1 and read the answers of the data host, so no path may resolve outside the served folder.
 */

import { stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { headersOfPath, isDataKey } from "@panx/data-format";

import { appCacheControl, isPagePath, SITE_CSP } from "./app-site";
import { answerRange } from "./range";

export type Handler = (request: Request) => Promise<Response>;

/** Return the handler of the app host for a build folder (`packages/app/dist`). */
export function appHandler(dist: string): Handler {
  return async (request) => {
    if (!isReadMethod(request.method)) {
      return forbidden();
    }
    const key = pageKey(requestPath(request));
    const file = key === undefined ? undefined : isPagePath(key) ? "index.html" : key;
    const blob = file === undefined ? undefined : await fileIn(dist, file);
    if (file === undefined || blob === undefined) {
      const notFound = Bun.file(join(dist, "404.html"));
      return new Response(notFound, { status: 404, headers: appHeaders("404.html", notFound) });
    }
    return new Response(blob, { headers: appHeaders(file, blob) });
  };
}

/** Return the handler of the data host for a data root folder, with the object headers of the data format. */
export function dataHandler(root: string): Handler {
  return async (request) => {
    if (!isReadMethod(request.method)) {
      return withCors(forbidden());
    }
    const key = requestPath(request).slice(1);
    const objectHeaders = isSafeKey(key) ? headersOfPath(key) : undefined;
    const blob = objectHeaders === undefined ? undefined : await fileIn(root, key);
    if (objectHeaders === undefined || blob === undefined) {
      return withCors(new Response("Not Found\n", { status: 404, headers: { "Content-Type": "text/plain" } }));
    }
    const headers = new Headers({
      "Content-Type": objectHeaders.contentType,
      "Cache-Control": objectHeaders.cacheControl,
      "Accept-Ranges": "bytes",
      "Last-Modified": new Date(blob.lastModified).toUTCString(),
    });
    if (objectHeaders.contentEncoding !== null) {
      headers.set("Content-Encoding", objectHeaders.contentEncoding);
    }
    if (objectHeaders.contentDisposition !== null) {
      headers.set("Content-Disposition", objectHeaders.contentDisposition);
    }
    const range = answerRange(request.headers.get("Range"), blob.size);
    switch (range.kind) {
      case "whole":
        headers.set("Content-Length", String(blob.size));
        return withCors(new Response(blob, { headers }));
      case "partial":
        headers.set("Content-Range", `bytes ${range.first}-${range.last}/${blob.size}`);
        headers.set("Content-Length", String(range.last - range.first + 1));
        return withCors(new Response(blob.slice(range.first, range.last + 1), { status: 206, headers }));
      case "unsatisfiable":
        headers.set("Content-Range", `bytes */${blob.size}`);
        return withCors(new Response(undefined, { status: 416, headers }));
    }
  };
}

/** Wrap a handler so that it logs one line per request to stderr: method, path, range, status, and body bytes. */
export function logged(name: string, handler: Handler): Handler {
  return async (request) => {
    const response = await handler(request);
    const bytes = request.method === "HEAD" ? 0 : Number(response.headers.get("Content-Length") ?? 0);
    const range = request.headers.get("Range") ?? "-";
    console.error(`${name} ${request.method} ${requestPath(request)} ${range} ${response.status} ${bytes}`);
    return response;
  };
}

/** Return the path of a request as sent, without decoding. */
function requestPath(request: Request): string {
  return new URL(request.url).pathname;
}

/**
 * Return the file key of an app path: `""` for `/`, the path without its leading `/` and one trailing `/` of a page
 * path, or `undefined` for a path outside the key rules.
 */
function pageKey(path: string): string | undefined {
  if (path === "/") {
    return "";
  }
  const key = path.slice(1).replace(/\/$/, "");
  return isSafeKey(key) && (key === path.slice(1) || isPagePath(key)) ? key : undefined;
}

/** Return whether a key follows the key rules: no `%` or `\`, no empty, `.`, or `..` segment. */
function isSafeKey(key: string): boolean {
  return !key.includes("%") && !key.includes("\\") && isDataKey(key);
}

/** Return the file at a key inside a folder, or `undefined` when it is not a file or would lie outside the folder. */
async function fileIn(folder: string, key: string): Promise<Bun.BunFile | undefined> {
  const base = resolve(folder);
  const path = resolve(base, key);
  if (!path.startsWith(`${base}${sep}`)) {
    return undefined;
  }
  const info = await stat(path).catch(() => undefined);
  return info?.isFile() ? Bun.file(path) : undefined;
}

function appHeaders(file: string, blob: Bun.BunFile): Headers {
  return new Headers({
    "Content-Type": blob.type,
    "Cache-Control": appCacheControl(file),
    "Content-Length": String(blob.size),
    "Content-Security-Policy": SITE_CSP,
  });
}

function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

function forbidden(): Response {
  return new Response("Forbidden\n", { status: 403, headers: { "Content-Type": "text/plain" } });
}

function withCors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}
