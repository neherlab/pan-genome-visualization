/** Access to a data root for the verifier: a local folder, or a deployed data host over HTTP. */

import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { dataUrl } from "../paths";
import { concat } from "./gzip";

/** The stored bytes of the objects of a data root, by data path. */
export interface DataSource {
  /** The data root as given, for messages. */
  readonly root: string;
  /** Return the stored bytes of an object, or `undefined` when it does not exist. */
  read(path: string): Promise<Uint8Array | undefined>;
  /** Return the stored bytes of an object in chunks, or `undefined` when it does not exist. */
  stream(path: string): Promise<AsyncIterable<Uint8Array> | undefined>;
  /** Return the paths of every file below a release folder, relative to it, or `undefined` when it cannot list. */
  list(release: string): Promise<string[] | undefined>;
  /** Return whether a release folder exists. */
  hasRelease(release: string): Promise<boolean>;
}

/** A data root folder. */
export class FolderSource implements DataSource {
  readonly root: string;
  readonly #folder: string;

  constructor(folder: string) {
    this.root = folder;
    this.#folder = resolve(folder);
  }

  async read(path: string): Promise<Uint8Array | undefined> {
    const file = await this.#file(path);
    return file === undefined ? undefined : file.bytes();
  }

  async stream(path: string): Promise<AsyncIterable<Uint8Array> | undefined> {
    const file = await this.#file(path);
    return file?.stream();
  }

  async list(release: string): Promise<string[] | undefined> {
    const folder = join(this.#folder, release);
    if (!(await isDirectory(folder))) {
      return undefined;
    }
    const entries = await readdir(folder, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => relative(folder, join(entry.parentPath, entry.name)));
  }

  hasRelease(release: string): Promise<boolean> {
    return isDirectory(join(this.#folder, release));
  }

  async #file(path: string): Promise<Bun.BunFile | undefined> {
    const file = join(this.#folder, path);
    return (await stat(file).catch(() => undefined))?.isFile() === true ? Bun.file(file) : undefined;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => undefined))?.isDirectory() ?? false;
}

/** Bound on the requests that run at once; counts every request. */
export class Limiter {
  requests = 0;
  readonly #limit: number;
  #running = 0;
  readonly #waiting: (() => void)[] = [];

  constructor(limit: number) {
    this.#limit = limit;
  }

  /** Wait for a free slot and return the function that frees it again. */
  async acquire(): Promise<() => void> {
    if (this.#running >= this.#limit) {
      await new Promise<void>((resolveSlot) => this.#waiting.push(resolveSlot));
    } else {
      this.#running += 1;
    }
    this.requests += 1;
    let freed = false;
    return () => {
      if (freed) {
        return;
      }
      freed = true;
      const next = this.#waiting.shift();
      if (next === undefined) {
        this.#running -= 1;
      } else {
        next();
      }
    };
  }

  /** Run `task` in a slot, which it holds until its promise settles. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    const free = await this.acquire();
    try {
      return await task();
    } finally {
      free();
    }
  }
}

/** A failed HTTP request of the verifier: a network failure or an unexpected status. */
export class HttpError extends Error {
  override readonly name = "HttpError";
}

/** Origin header of the verifier's requests, so that the answers carry the CORS header that browsers get. */
export const REQUEST_ORIGIN = "https://pangenome.org";

/** A deployed data host. Every request goes through `limiter`, and bodies arrive as stored, without decompression. */
export class HttpSource implements DataSource {
  readonly root: string;
  readonly limiter: Limiter;

  constructor(root: string, limiter: Limiter) {
    this.root = root;
    this.limiter = limiter;
  }

  /** Return the URL of a data path. */
  url(path: string): string {
    return dataUrl(this.root, path);
  }

  /** Send a request and return the answer, with its body read by `read` inside the request's slot. */
  request<T>(path: string, init: RequestInit, read: (response: Response) => Promise<T>): Promise<T> {
    const url = this.url(path);
    return this.limiter.run(async () => {
      let response: Response;
      try {
        response = await fetch(url, { ...init, decompress: false, redirect: "manual" });
      } catch (error) {
        throw new HttpError(`${init.method ?? "GET"} ${url} failed: ${String(error)}`, { cause: error });
      }
      return read(response);
    });
  }

  read(path: string): Promise<Uint8Array | undefined> {
    return this.request(path, { headers: { Origin: REQUEST_ORIGIN } }, async (response) => {
      if (response.status === 404) {
        await response.body?.cancel();
        return undefined;
      }
      if (response.status !== 200) {
        await response.body?.cancel();
        throw new HttpError(`GET ${this.url(path)} answered ${response.status}`);
      }
      return response.bytes();
    });
  }

  async stream(path: string): Promise<AsyncIterable<Uint8Array> | undefined> {
    const url = this.url(path);
    const free = await this.limiter.acquire();
    let response: Response;
    try {
      response = await fetch(url, { headers: { Origin: REQUEST_ORIGIN }, decompress: false, redirect: "manual" });
    } catch (error) {
      free();
      throw new HttpError(`GET ${url} failed: ${String(error)}`, { cause: error });
    }
    if (response.status !== 200 || response.body === null) {
      free();
      await response.body?.cancel();
      if (response.status === 404) {
        return undefined;
      }
      throw new HttpError(`GET ${url} answered ${response.status}`);
    }
    return bodyChunks(response.body, free);
  }

  list(): Promise<undefined> {
    return Promise.resolve(undefined);
  }

  hasRelease(release: string): Promise<boolean> {
    return this.request(`${release}/manifest.json`, { method: "HEAD" }, (response) =>
      Promise.resolve(response.status === 200),
    );
  }
}

/** Yield the chunks of a body and free its request slot when the reading ends, also when it ends early. */
async function* bodyChunks(body: ReadableStream<Uint8Array>, free: () => void): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();
  try {
    // oxlint-disable-next-line no-await-in-loop
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      yield chunk.value;
    }
  } finally {
    free();
    await reader.cancel().catch(() => undefined);
  }
}

/** Reader of exact byte counts from a stream of chunks; every chunk also goes to `onChunk`. */
export class ByteReader {
  readonly #chunks: AsyncIterator<Uint8Array>;
  readonly #onChunk: (chunk: Uint8Array) => void;
  /** Chunks read from the stream and not yet returned. */
  #pending: Uint8Array[] = [];
  #pendingLength = 0;
  #done = false;

  constructor(chunks: AsyncIterable<Uint8Array>, onChunk: (chunk: Uint8Array) => void) {
    this.#chunks = chunks[Symbol.asyncIterator]();
    this.#onChunk = onChunk;
  }

  /** Return the next `count` bytes, or fewer when the stream ends first. */
  async read(count: number): Promise<Uint8Array> {
    // Each pull waits for the chunk before it; the stream yields its chunks in order.
    // oxlint-disable-next-line no-await-in-loop
    while (this.#pendingLength < count && (await this.#pull())) {
      // pull until `count` bytes are pending
    }
    const bytes = concat(this.#pending);
    const result = bytes.subarray(0, count);
    const rest = bytes.subarray(result.length);
    this.#pending = rest.length === 0 ? [] : [rest];
    this.#pendingLength = rest.length;
    return result;
  }

  /** Return every byte up to the end of the stream. */
  async rest(): Promise<Uint8Array> {
    // oxlint-disable-next-line no-await-in-loop
    while (await this.#pull()) {
      // pull until the stream ends
    }
    return this.read(this.#pendingLength);
  }

  /** Stop reading the stream. */
  async close(): Promise<void> {
    this.#done = true;
    await this.#chunks.return?.();
  }

  async #pull(): Promise<boolean> {
    if (this.#done) {
      return false;
    }
    const next = await this.#chunks.next();
    if (next.done === true) {
      this.#done = true;
      return false;
    }
    this.#onChunk(next.value);
    this.#pending.push(next.value);
    this.#pendingLength += next.value.length;
    return true;
  }
}
