/**
 * Check a data root against the data format (docs/data-format.md, "What makes a deployment valid").
 *
 * Usage: bun packages/data-format/src/cli.ts [--release <id>] [--require <id>,...] [--deep]
 *
 * PANX_DATA names the data root: a folder, which gets every check, or the URL of a deployed data host, which gets the
 * HTTP checks, and with --deep also every check of the downloaded objects. Every release of releases.json is checked,
 * or only the one of --release, also when releases.json does not list it yet. The default release must have the
 * datasets that the home page links to (packages/app/src/pages/linked-datasets.json), or those of --require.
 *
 * Writes one line per violation to stderr, `<data path>: <rule>: <message>`, and a summary to stdout. Exits 0 when
 * every check passes, 1 on any violation, 2 on a usage error.
 */

import { stat } from "node:fs/promises";
import { parseArgs } from "node:util";

import { z } from "zod";

import linkedDatasets from "../../app/src/pages/linked-datasets.json";
import { DATASET_ID_PATTERN, RELEASE_ID_PATTERN } from "./paths";
import { RULES } from "./verify/report";
import { FolderSource, HttpSource, Limiter } from "./verify/source";
import { verifyDataRoot } from "./verify/verifier";

/** Requests to a data host at once. */
const REQUESTS_AT_ONCE = 16;

const USAGE = "usage: verify-data [--release <id>] [--require <id>,...] [--deep]";

const HELP = `${USAGE}

Check the data root of PANX_DATA against the panX data format (docs/data-format.md).

  PANX_DATA          a data root folder (every check) or the URL of a data host (the HTTP checks)
  --release <id>     check only this release, also when releases.json does not list it
  --require <ids>    comma-separated datasets that the default release must have, in place of
                     packages/app/src/pages/linked-datasets.json; an empty value requires none
  --deep             with a URL: also download every object and run every check on it

Rules:
${Object.entries(RULES)
  .map(([rule, description]) => `  ${rule.padEnd(19)}${description}`)
  .join("\n")}
`;

const { values } = parseCommandLine();

if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const root = process.env["PANX_DATA"] ?? "";
const isUrl = /^https?:\/\//.test(root);
if (root === "") {
  usage("PANX_DATA is not set: give a data root folder or URL");
}
if (!isUrl && !(await stat(root).catch(() => undefined))?.isDirectory()) {
  usage(`PANX_DATA is neither an http(s) URL nor a folder: ${root}`);
}
if (values.deep && !isUrl) {
  usage("--deep applies to a URL; a folder gets every check");
}
if (values.release !== undefined && !RELEASE_ID_PATTERN.test(values.release)) {
  usage(`--release ${JSON.stringify(values.release)} is no release id such as 20261112T080000Z`);
}
const required =
  values.require === undefined
    ? z.array(z.string().regex(DATASET_ID_PATTERN)).parse(linkedDatasets)
    : values.require.split(",").filter((id) => id !== "");
for (const id of required) {
  if (!DATASET_ID_PATTERN.test(id)) {
    usage(`--require: ${JSON.stringify(id)} is no dataset id`);
  }
}

const source = isUrl ? new HttpSource(root, new Limiter(REQUESTS_AT_ONCE)) : new FolderSource(root);
const report = await verifyDataRoot({ source, deep: values.deep, release: values.release, required });

const { releases, datasets, clusters, objects, requests } = report.counts;
const counted = [
  plural(releases, "release"),
  plural(datasets, "dataset"),
  plural(clusters, "cluster"),
  plural(objects, "object"),
  ...(isUrl ? [plural(requests, "request")] : []),
];
const skipped = report.skipped === 0 ? "" : `, ${plural(report.skipped, "check")} skipped after failed inputs`;
console.log(`${root}: ${counted.join(", ")}: ${plural(report.violations, "violation")}${skipped}`);
process.exit(report.violations === 0 ? 0 : 1);

function parseCommandLine() {
  try {
    return parseArgs({
      args: Bun.argv.slice(2),
      options: {
        release: { type: "string" },
        require: { type: "string" },
        deep: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      strict: true,
    });
  } catch (error) {
    return usage(error instanceof Error ? error.message : String(error));
  }
}

function plural(count: number, noun: string): string {
  return `${count.toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;
}

function usage(message: string): never {
  console.error(message === "" ? USAGE : `verify-data: ${message}\n${USAGE}`);
  process.exit(2);
}
