/**
 * The verifier of a data root (docs/data-format.md, "What makes a deployment valid"): a folder gets every check; a
 * deployed data host gets the HTTP checks, and with `deep` also every check on the downloaded objects.
 */

import type { z } from "zod";

import { headersOfPath } from "../headers";
import { DATASET_FILES, RELEASES_FILE } from "../paths";
import { Clusters, type DatasetEntry, Manifest, type ManifestObject, ReleaseIndex, Releases } from "../schemas";
import { verifyDataset } from "./dataset";
import { gunzipMember, isGzip } from "./gzip";
import { HttpChecks, headerDifferences } from "./http";
import { type Rule, Report, errorMessage, found, hex } from "./report";
import { type DataSource, HttpSource } from "./source";

export interface VerifyOptions {
  readonly source: DataSource;
  /** With a data host: also run every check on the downloaded objects. */
  readonly deep: boolean;
  /** Check only this release, also when releases.json does not list it. */
  readonly release: string | undefined;
  /** Datasets that the default release must have. */
  readonly required: readonly string[];
}

/** The facts of the release under check that the dataset checks need. */
export interface ReleaseContext {
  readonly id: string;
  /** The objects of `manifest.json` by path, or `undefined` when the manifest failed its checks. */
  readonly manifest: ReadonlyMap<string, ManifestObject> | undefined;
}

const UTF8 = new TextDecoder("utf-8", { fatal: true });

/** Run every check of a data root and return the report. */
export async function verifyDataRoot(options: VerifyOptions): Promise<Report> {
  const verifier = new Verifier(options);
  await verifier.run();
  return verifier.report;
}

export class Verifier {
  readonly report = new Report();
  readonly source: DataSource;
  /** Whether the checks read every object: always for a folder, with `deep` for a data host. */
  readonly full: boolean;
  readonly http: HttpChecks | undefined;
  readonly #options: VerifyOptions;

  constructor(options: VerifyOptions) {
    this.#options = options;
    this.source = options.source;
    this.http = options.source instanceof HttpSource ? new HttpChecks(this, options.source) : undefined;
    this.full = this.http === undefined || options.deep;
  }

  async run(): Promise<void> {
    const releases = await this.#readReleases();
    const ids =
      this.#options.release === undefined
        ? (releases?.releases.map((entry) => entry.id) ?? [])
        : [this.#options.release];
    for (const id of ids) {
      const entry = releases?.releases.find((release) => release.id === id);
      // The default release, or a release that is not listed yet and so may become the default.
      const isDefault = entry === undefined || id === releases?.default;
      // Each release is checked on its own, so the output follows the release order.
      // oxlint-disable-next-line no-await-in-loop
      await this.#verifyRelease(id, isDefault);
    }
    if (this.http !== undefined) {
      this.report.counts.requests = this.http.source.limiter.requests;
    }
  }

  /** Report a violation. */
  violation(location: string, rule: Rule, message: string): void {
    this.report.violation(location, rule, message);
  }

  /**
   * Return the stored bytes of an object, and with a manifest compare their size and SHA-256 with its entry. Return
   * `undefined` for a missing object, reported as `missingRule` when one is given.
   */
  async load(path: string, release: ReleaseContext | undefined, missingRule?: Rule): Promise<Uint8Array | undefined> {
    let bytes: Uint8Array | undefined;
    try {
      bytes = await this.source.read(path);
    } catch (error) {
      this.violation(path, "read", errorMessage(error));
      return undefined;
    }
    if (bytes === undefined) {
      if (missingRule !== undefined) {
        this.violation(path, missingRule, "the object does not exist");
      }
      return undefined;
    }
    this.report.counts.objects += 1;
    if (release !== undefined) {
      this.checkStored(release, path, bytes.length, new Bun.CryptoHasher("sha256").update(bytes).digest("hex"));
    }
    return bytes;
  }

  /** Compare the size and SHA-256 of a stored object with its manifest entry, when the manifest lists it. */
  checkStored(release: ReleaseContext, path: string, size: number, sha256: string): void {
    const listed = release.manifest?.get(path.slice(release.id.length + 1));
    if (listed === undefined) {
      return;
    }
    if (listed.size !== size) {
      this.violation(
        `${release.id}/manifest.json`,
        "manifest",
        `size of ${path} is ${listed.size}, the object has ${size}`,
      );
    }
    if (listed.sha256 !== sha256) {
      this.violation(
        `${release.id}/manifest.json`,
        "manifest",
        `SHA-256 of ${path} is ${listed.sha256}, the object has ${sha256}`,
      );
    }
  }

  /**
   * Return the text of a stored text object: one gzip member with the fixed header, then UTF-8. A plain object is
   * reported and read as it is. Return `undefined` when the bytes cannot be decoded, reported as `textRule`.
   */
  async decodeText(path: string, bytes: Uint8Array, textRule: Rule): Promise<string | undefined> {
    let data = bytes;
    if (isGzip(bytes)) {
      try {
        const member = await gunzipMember(bytes);
        if (!member.fixedHeader) {
          this.violation(path, "gzip", `gzip header ${hex(bytes.subarray(0, 10))} is not the fixed header`);
        }
        if (member.trailing > 0) {
          this.violation(path, "gzip", `${member.trailing} bytes follow the first gzip member`);
        }
        data = member.data;
      } catch (error) {
        this.violation(path, "gzip", errorMessage(error));
        return undefined;
      }
    } else {
      this.violation(path, "gzip", "the object is stored without gzip compression");
    }
    try {
      return UTF8.decode(data);
    } catch {
      this.violation(path, textRule, "the text is not UTF-8");
      return undefined;
    }
  }

  /**
   * Return the parsed JSON file at a path when it decodes and passes its schema; report each fault and return
   * `undefined` otherwise. `bytes` are the stored bytes, when the caller has loaded them.
   */
  async parseJson<T>(path: string, bytes: Uint8Array, schema: z.ZodType<T>): Promise<T | undefined> {
    const text = await this.decodeText(path, bytes, "schema");
    if (text === undefined) {
      return undefined;
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      this.violation(path, "schema", `not JSON: ${errorMessage(error)}`);
      return undefined;
    }
    const result = schema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        this.violation(path, "schema", `${issuePath(issue.path)}: ${issue.message}`);
      }
      return undefined;
    }
    return result.data;
  }

  /** Load and parse a JSON file; report a missing file as `missingRule` when one is given. */
  async readJson<T>(
    path: string,
    schema: z.ZodType<T>,
    release: ReleaseContext | undefined,
    missingRule?: Rule,
  ): Promise<T | undefined> {
    const bytes = await this.load(path, release, missingRule);
    if (bytes === undefined) {
      this.report.skip();
      return undefined;
    }
    return this.parseJson(path, bytes, schema);
  }

  async #readReleases(): Promise<Releases | undefined> {
    const optional = this.#options.release !== undefined;
    const releases = await this.readJson(RELEASES_FILE, Releases, undefined, optional ? undefined : "read");
    if (releases === undefined) {
      return undefined;
    }
    await this.http?.checkHead(RELEASES_FILE, undefined);
    await Promise.all(
      releases.releases.map(async (entry) => {
        let exists: boolean;
        try {
          exists = await this.source.hasRelease(entry.id);
        } catch (error) {
          this.violation(RELEASES_FILE, "read", errorMessage(error));
          return;
        }
        if (!exists) {
          this.violation(RELEASES_FILE, "releases-folders", `release folder ${entry.id} does not exist`);
        }
      }),
    );
    return releases;
  }

  async #verifyRelease(id: string, isDefault: boolean): Promise<void> {
    this.report.counts.releases += 1;
    const manifestPath = `${id}/manifest.json`;
    const manifestBytes = await this.load(manifestPath, undefined, "read");
    const manifest =
      manifestBytes === undefined ? undefined : await this.parseJson(manifestPath, manifestBytes, Manifest);
    if (manifest !== undefined && manifest.release !== id) {
      this.violation(manifestPath, "release-id", `release is ${found(manifest.release)}, the folder is ${id}`);
    }
    const release: ReleaseContext = {
      id,
      manifest: manifest === undefined ? undefined : new Map(manifest.objects.map((object) => [object.path, object])),
    };

    const index = await this.readJson(`${id}/index.json`, ReleaseIndex, release, "read");
    if (index === undefined) {
      return;
    }
    if (index.release !== id) {
      this.violation(`${id}/index.json`, "release-id", `release is ${found(index.release)}, the folder is ${id}`);
    }
    if (isDefault) {
      const datasets = new Set(index.datasets.map((dataset) => dataset.id));
      for (const required of this.#options.required) {
        if (!datasets.has(required)) {
          this.violation(
            `${id}/index.json`,
            "linked-datasets",
            `the release has no dataset ${required}, which the home page links to`,
          );
        }
      }
    }

    const expected = [
      "index.json",
      ...index.datasets.flatMap((dataset) => DATASET_FILES.map((file) => `${dataset.id}/${file}`)),
    ];
    if (manifest !== undefined) {
      this.#checkManifestHeaders(id, manifest);
      this.#checkManifestListing(id, manifest, expected);
    }
    const files = await this.source.list(id);
    if (files !== undefined) {
      this.#checkFolderListing(id, files, expected, manifest);
    }
    await this.http?.checkRelease(release, expected, manifestBytes?.length);

    if (this.full) {
      for (const dataset of index.datasets) {
        // The datasets are checked one after another, so the memory holds the files of one dataset only.
        // oxlint-disable-next-line no-await-in-loop
        const clusters = await verifyDataset(this, release, dataset);
        // oxlint-disable-next-line no-await-in-loop
        await this.http?.checkRanges(release, dataset, clusters);
      }
    } else if (this.http !== undefined) {
      const http = this.http;
      await Promise.all(index.datasets.map((dataset) => this.#rangesOnly(http, release, dataset)));
    }
  }

  async #rangesOnly(http: HttpChecks, release: ReleaseContext, dataset: DatasetEntry): Promise<void> {
    this.report.counts.datasets += 1;
    const path = `${release.id}/${dataset.id}/clusters.json`;
    const bytes = await this.load(path, undefined);
    const clusters = bytes === undefined ? undefined : await this.parseJson(path, bytes, Clusters);
    this.report.counts.clusters += clusters?.clusters.length ?? 0;
    await http.checkRanges(release, dataset, clusters);
  }

  /** Compare the headers of every manifest entry with the headers of its path. */
  #checkManifestHeaders(id: string, manifest: Manifest): void {
    const location = `${id}/manifest.json`;
    for (const object of manifest.objects) {
      const headers = headersOfPath(`${id}/${object.path}`);
      if (object.path === "manifest.json") {
        this.violation(location, "manifest", "the manifest lists itself");
        continue;
      }
      if (headers === undefined) {
        this.violation(location, "manifest", `${object.path} is no object of the layout`);
        continue;
      }
      for (const difference of headerDifferences(object, headers)) {
        this.violation(location, "manifest", `${object.path}: ${difference}`);
      }
    }
  }

  /** Report the objects of the layout that the manifest does not list. */
  #checkManifestListing(id: string, manifest: Manifest, expected: readonly string[]): void {
    const listed = new Set(manifest.objects.map((object) => object.path));
    for (const path of expected) {
      if (!listed.has(path)) {
        this.violation(`${id}/manifest.json`, "manifest", `${path} is not listed`);
      }
    }
  }

  /** Compare the files of a release folder with the layout and the manifest. */
  #checkFolderListing(
    id: string,
    files: readonly string[],
    expected: readonly string[],
    manifest: Manifest | undefined,
  ): void {
    const present = new Set(files);
    for (const path of expected) {
      if (!present.has(path)) {
        this.violation(`${id}/${path}`, path === "index.json" ? "read" : "dataset-files", "the file does not exist");
      }
    }
    if (manifest === undefined) {
      return;
    }
    const listed = new Set(manifest.objects.map((object) => object.path));
    for (const path of files) {
      if (path !== "manifest.json" && !listed.has(path)) {
        this.violation(`${id}/manifest.json`, "manifest", `file ${path} of the folder is not listed`);
      }
    }
    for (const path of listed) {
      if (!present.has(path)) {
        this.violation(`${id}/manifest.json`, "manifest", `listed object ${path} is not in the folder`);
      }
    }
  }
}

/** Return a zod issue path as `clusters[3].range`. */
function issuePath(path: readonly PropertyKey[]): string {
  return (
    path.reduce<string>(
      (text, key) => (typeof key === "number" ? `${text}[${key}]` : `${text}${text === "" ? "" : "."}${String(key)}`),
      "",
    ) || "(file)"
  );
}
