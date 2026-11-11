/**
 * The objects of an app build (`dist/`) in the app bucket, and their upload. Each file goes to `<prefix><path>` with
 * its content type and the `Cache-Control` of the local app host. The edge of the site serves a `.br` or `.gz` copy
 * of every path that does not end in an archive extension, without checking that the copy exists, so each such file
 * also gets both copies with their `Content-Encoding`.
 */

import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { appCacheControl, STATIC_FOLDER_PATTERN } from "@panx/local-server/app-site";

import { mapLimited } from "./concurrency";

/**
 * Suffixes for which the edge requests no compressed copy: `ARCHIVES` of `edge/lib.js` in the infrastructure
 * repository `neherlab-infra` (commit 9d2ab7f, branch `backup/main-full-draft`), matched case-sensitively as there.
 */
export const ARCHIVES = [".7z", ".br", ".bz2", ".gz", ".lz", ".lz4", ".lzma", ".lzo", ".sz", ".xz", ".zip", ".zst"];

/** The compressed copies of a file, by their suffix and `Content-Encoding`. */
const COPIES = [
  {
    suffix: ".br",
    encoding: "br",
    compress: (bytes: Uint8Array) =>
      brotliCompressSync(bytes, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length },
      }),
  },
  { suffix: ".gz", encoding: "gzip", compress: (bytes: Uint8Array) => gzipSync(bytes, { level: 9 }) },
] as const;

/** Requests at once of an upload. */
export const JOBS = 32;

/** One object of the upload. */
export interface SiteObject {
  /** Path of the build file that the object holds, relative to `dist/`. */
  readonly file: string;
  readonly key: string;
  readonly body: Uint8Array;
  readonly contentType: string;
  readonly contentEncoding: "br" | "gzip" | undefined;
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

/** Return whether the edge requests compressed copies of a path. */
export function hasCopies(path: string): boolean {
  return !ARCHIVES.some((suffix) => path.endsWith(suffix));
}

/** Return the objects of the build files: each file, and the `.br` and `.gz` copies of each file that needs them. */
export async function siteObjects(dist: string, files: readonly string[], prefix: string): Promise<SiteObject[]> {
  const objects = await mapLimited(files, JOBS, async (file) => {
    const blob = Bun.file(join(dist, file));
    const body = await blob.bytes();
    const original: SiteObject = {
      file,
      key: `${prefix}${file}`,
      body,
      contentType: blob.type,
      contentEncoding: undefined,
      cacheControl: appCacheControl(file),
    };
    if (!hasCopies(file)) {
      return [original];
    }
    return [
      original,
      ...COPIES.map(({ suffix, encoding, compress }) => ({
        ...original,
        key: `${original.key}${suffix}`,
        body: compress(body),
        contentEncoding: encoding,
      })),
    ];
  });
  return objects.flat();
}

/** Return the files of a build that lack one of the compressed copies that the edge requests. */
export function missingCopies(files: readonly string[], objects: readonly SiteObject[], prefix: string): string[] {
  const keys = new Set(objects.map((object) => object.key));
  return files.filter((file) => hasCopies(file) && COPIES.some(({ suffix }) => !keys.has(`${prefix}${file}${suffix}`)));
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
            ...(object.contentEncoding === undefined ? {} : { ContentEncoding: object.contentEncoding }),
          }),
        );
      } catch (error) {
        throw new Error(`upload of s3://${bucket}/${object.key} failed: ${String(error)}`, { cause: error });
      }
    });
  }
}
