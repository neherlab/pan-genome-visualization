/**
 * Write the JSON Schema file `<name>.schema.json` of each JSON file of the format into a folder, or with `--check`
 * compare the folder with fresh files and exit 1 on any difference.
 *
 * Usage: bun scripts/schemas.ts [--check] <folder>
 */

import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { FILE_SCHEMAS } from "../src/schemas";

const SUFFIX = ".schema.json";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: { check: { type: "boolean", default: false } },
  allowPositionals: true,
});
const [folder] = positionals;
if (folder === undefined || positionals.length !== 1) {
  console.error("usage: bun scripts/schemas.ts [--check] <folder>");
  process.exit(2);
}

const fresh = new Map(
  Object.entries(FILE_SCHEMAS).map(([name, schema]) => [
    `${name}${SUFFIX}`,
    `${JSON.stringify(z.toJSONSchema(schema, { target: "draft-2020-12" }), null, 2)}\n`,
  ]),
);
const existing = (await readdir(folder).catch(() => [])).filter((file) => file.endsWith(SUFFIX));
const stale = existing.filter((file) => !fresh.has(file));

if (values.check) {
  const differing = await Promise.all(
    [...fresh].map(async ([file, content]) => {
      const stored = Bun.file(join(folder, file));
      return (await stored.exists()) && (await stored.text()) === content ? [] : [file];
    }),
  );
  const problems = [
    ...differing.flat().map((file) => `${join(folder, file)} differs from the zod schemas`),
    ...stale.map((file) => `${join(folder, file)} has no zod schema`),
  ];
  for (const problem of problems) {
    console.error(`${problem}: run \`just schemas\``);
  }
  process.exit(problems.length === 0 ? 0 : 1);
}

await Promise.all([
  ...[...fresh].map(([file, content]) => Bun.write(join(folder, file), content)),
  ...stale.map((file) => rm(join(folder, file))),
]);
