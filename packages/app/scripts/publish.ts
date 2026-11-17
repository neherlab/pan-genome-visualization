/**
 * Upload an app build (`packages/app/dist/`) to the app bucket of the site.
 *
 * Usage: bun packages/app/scripts/publish.ts [--dry-run] [--dist <folder>]
 *
 * The static folder `static-<build id>/` goes first, then the other files, then the pages, so a page never refers
 * to a file that is not stored yet. Objects of earlier builds stay, so a page that a browser or the CDN still holds
 * keeps loading its own static folder. Every object carries its `Cache-Control`, and pages revalidate on every
 * request, so a publish clears no cache. `--dry-run` lists the writes on stdout and sends no request.
 *
 * Environment:
 *   AWS_S3_BUCKET   the app bucket
 *   AWS_S3_PREFIX   the key prefix of the host, such as `pangenome.org/`; empty for the bucket root
 *   AWS_REGION      the region of the bucket, and the credentials of the AWS SDK's default chain (not for --dry-run)
 */

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { S3Client } from "@aws-sdk/client-s3";

import { JOBS, buildFiles, siteObjects, uploadObjects, uploadSteps } from "./site-upload";

const USAGE = "usage: publish.ts [--dry-run] [--dist <folder>]";

const { values } = parseCommandLine();
const dist = resolve(values.dist ?? resolve(import.meta.dir, "../dist"));
const bucket = requireEnv("AWS_S3_BUCKET");
const prefix = process.env["AWS_S3_PREFIX"] ?? "";
if (prefix !== "" && (prefix.startsWith("/") || !prefix.endsWith("/"))) {
  fail(`AWS_S3_PREFIX must be empty or end with "/" and not start with "/": ${JSON.stringify(prefix)}`);
}

const files = await buildFiles(dist).catch((error: unknown) => fail(String(error)));
const objects = await siteObjects(dist, files, prefix);
const steps = uploadSteps(objects);

if (values["dry-run"]) {
  for (const object of steps.flat()) {
    console.log(
      `PUT s3://${bucket}/${object.key}\t${object.body.length}\t${object.contentType}\t${object.cacheControl}`,
    );
  }
  console.error(`dry run: ${objects.length} writes for ${files.length} files of ${dist}; no request sent`);
} else {
  const client = new S3Client({ requestHandler: { httpsAgent: { keepAlive: true, maxSockets: JOBS } } });
  await uploadObjects(client, bucket, steps).catch((error: unknown) => fail(String(error)));
  console.error(`published ${objects.length} objects for ${files.length} files to s3://${bucket}/${prefix}`);
}

function parseCommandLine() {
  try {
    return parseArgs({
      args: Bun.argv.slice(2),
      options: { "dry-run": { type: "boolean", default: false }, dist: { type: "string" } },
      strict: true,
    });
  } catch (error) {
    console.error(`publish: ${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
    return process.exit(2);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    fail(`${name} is not set`);
  }
  return value;
}

function fail(message: string): never {
  console.error(`publish: ${message}`);
  process.exit(1);
}
