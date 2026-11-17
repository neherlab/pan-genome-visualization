/**
 * The objects of an app build (`dist/`) in the app bucket, and their upload. Each file goes to `<prefix><path>` with
 * its content type and the `Cache-Control` of the local app host, uncompressed: the CDN compresses it for each request.
 */

import { join } from "node:path";

import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { appCacheControl, STATIC_FOLDER_PATTERN } from "@panx/local-server/app-site";

import { mapLimited } from "./concurrency";

/** Requests at once of an upload. */
export const JOBS = 32;

/** One object of the upload. */
export interface SiteObject {
  /** Path of the build file that the object holds, relative to `dist/`. */
  readonly file: string;
  readonly key: string;
  readonly body: Uint8Array;
  readonly contentType: string;
  readonly cacheControl: string;
}

/** Return the files of a build, sorted; fail when the folder holds no build. */
export async function buildFiles(dist: string): Promise<string[]> {
  const files = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dist, dot: true }))).toSorted();
  if (!files.includes("index.html")) {
    throw new Error(`${dist} holds no build (no index.html): run \`just build\` first`);
  }
  return files;
}

/** Return the objects of the build files, one per file. */
export async function siteObjects(dist: string, files: readonly string[], prefix: string): Promise<SiteObject[]> {
  return mapLimited(files, JOBS, async (file) => {
    const blob = Bun.file(join(dist, file));
    return {
      file,
      key: `${prefix}${file}`,
      body: await blob.bytes(),
      contentType: blob.type,
      cacheControl: appCacheControl(file),
    };
  });
}

/**
 * Split the objects into the steps of an upload: the static folder of the build, then the other files, then the
 * pages, so that a page never refers to a file that is not stored yet.
 */
export function uploadSteps(objects: readonly SiteObject[]): SiteObject[][] {
  const isStatic = (object: SiteObject) => STATIC_FOLDER_PATTERN.test(object.file.split("/")[0] ?? "");
  const isPage = (object: SiteObject) => object.file.endsWith(".html");
  return [
    objects.filter(isStatic),
    objects.filter((object) => !isStatic(object) && !isPage(object)),
    objects.filter((object) => !isStatic(object) && isPage(object)),
  ];
}

/** Upload the objects to a bucket, step by step. */
export async function uploadObjects(client: S3Client, bucket: string, steps: readonly SiteObject[][]): Promise<void> {
  for (const step of steps) {
    // Each step starts after the step before it has finished.
    // oxlint-disable-next-line no-await-in-loop
    await mapLimited(step, JOBS, async (object) => {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: object.key,
            Body: object.body,
            ContentType: object.contentType,
            CacheControl: object.cacheControl,
          }),
        );
      } catch (error) {
        throw new Error(`upload of s3://${bucket}/${object.key} failed: ${String(error)}`, { cause: error });
      }
    });
  }
}
