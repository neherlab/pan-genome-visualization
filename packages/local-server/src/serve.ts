/**
 * Local hosts of panX: the app host serves the build of `packages/app/dist/` with the routing and headers of the
 * deployed app host, and the data host serves a local data root with the headers of the data format.
 *
 * Usage: bun packages/local-server/src/serve.ts [--data-only]
 *
 * Environment:
 *   PANX_DATA   Data root: a folder, which the data host serves, or the URL of a deployed data host, for which no
 *               data host starts
 *   APP_PORT    Port of the app host, default 8000
 *   DATA_PORT   Port of the data host, default 8001
 *   HOST        Listen address, default 127.0.0.1; in the development container (PANX_CONTAINER=1) 0.0.0.0, so that
 *               the ports published on the host's 127.0.0.1 reach the servers
 *
 * `--data-only` starts only the data host, beside the Vite dev server of `just dev`.
 */

import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import { appHandler, dataHandler, logged } from "./hosts";

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== "--data-only");
if (unknown.length > 0) {
  fail(`unknown argument ${unknown.join(" ")}; usage: serve.ts [--data-only]`);
}
const dataOnly = args.includes("--data-only");

const hostname = process.env["HOST"] ?? (process.env["PANX_CONTAINER"] === "1" ? "0.0.0.0" : "127.0.0.1");
const appPort = port("APP_PORT", 8000);
const dataPort = port("DATA_PORT", 8001);
const dist = resolve(import.meta.dir, "../../app/dist");

const dataRoot = await dataFolder(process.env["PANX_DATA"]);
if (dataRoot === undefined && dataOnly) {
  fail("--data-only needs PANX_DATA set to a data root folder");
}

if (dataRoot !== undefined) {
  const server = Bun.serve({ hostname, port: dataPort, fetch: logged("data", dataHandler(dataRoot)) });
  console.error(`data host: ${dataRoot} at http://${server.hostname}:${server.port}/`);
}
if (!dataOnly) {
  if (!(await isDirectory(dist))) {
    fail(`${dist} is missing: run \`just build\` first`);
  }
  const server = Bun.serve({ hostname, port: appPort, fetch: logged("app", appHandler(dist)) });
  console.error(`app host: ${dist} at http://${server.hostname}:${server.port}/`);
}

/** Return the folder of a data root, `undefined` for a URL or no value; exit when a folder does not exist. */
async function dataFolder(value: string | undefined): Promise<string | undefined> {
  if (value === undefined || value === "" || /^https?:\/\//.test(value)) {
    return undefined;
  }
  if (!(await isDirectory(value))) {
    fail(`PANX_DATA is neither an http(s) URL nor a folder: ${value}`);
  }
  return resolve(value);
}

function port(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 65535) {
    fail(`${name} is not a port number: ${value}`);
  }
  return number;
}

async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => undefined))?.isDirectory() ?? false;
}

function fail(message: string): never {
  console.error(`serve.ts: ${message}`);
  process.exit(2);
}
