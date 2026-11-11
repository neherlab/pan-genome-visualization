/** A ustar reader that takes the archive in chunks, for archives too large to hold decompressed in memory. */

import { USTAR_BLOCK, type UstarEntry, UstarError, isZeroBlock, parseUstarHeader } from "../ustar";
import { concat } from "./gzip";

/** How a chunked archive ended. */
export interface UstarEnd {
  /** Byte offset of the end marker, or `null` when the archive has none. */
  readonly endOffset: number | null;
  /** Count of the bytes from the end marker to the end, all zero when `nonZeroAfterEnd` is false. */
  readonly endBytes: number;
  /** Whether a byte after the start of the end marker is not zero. */
  readonly nonZeroAfterEnd: boolean;
}

/** Parse a ustar archive from chunks: pass each regular file to `onEntry` as soon as its data is complete. */
export class UstarStream {
  readonly #onEntry: (entry: UstarEntry) => void;
  #pending: Uint8Array[] = [];
  #pendingLength = 0;
  #offset = 0;
  #endOffset: number | null = null;
  #endBytes = 0;
  #nonZeroAfterEnd = false;
  /** The header of the entry whose data is still incomplete. */
  #header: { readonly fields: Omit<UstarEntry, "data">; readonly size: number; readonly padded: number } | undefined;

  constructor(onEntry: (entry: UstarEntry) => void) {
    this.#onEntry = onEntry;
  }

  /** Take the next bytes of the archive. Throw `UstarError` on an invalid header. */
  push(chunk: Uint8Array): void {
    if (this.#endOffset !== null) {
      this.#afterEnd(chunk);
      return;
    }
    this.#pending.push(chunk);
    this.#pendingLength += chunk.length;
    for (;;) {
      if (this.#header === undefined) {
        if (this.#pendingLength < USTAR_BLOCK) {
          return;
        }
        const block = this.#take(USTAR_BLOCK);
        if (isZeroBlock(block)) {
          this.#endOffset = this.#offset;
          this.#afterEnd(block);
          this.#afterEnd(this.#take(this.#pendingLength));
          return;
        }
        const { size, ...fields } = parseUstarHeader(block, 0);
        this.#header = { fields, size, padded: Math.ceil(size / USTAR_BLOCK) * USTAR_BLOCK };
      }
      const { fields, size, padded } = this.#header;
      if (this.#pendingLength < padded) {
        return;
      }
      const data = this.#take(padded);
      this.#onEntry({ ...fields, data: data.subarray(0, size) });
      this.#offset += USTAR_BLOCK + padded;
      this.#header = undefined;
    }
  }

  /** Return how the archive ended. Throw `UstarError` when it ends inside an entry. */
  end(): UstarEnd {
    if (this.#endOffset === null && (this.#pendingLength > 0 || this.#header !== undefined)) {
      throw new UstarError("archive ends inside an entry", this.#offset);
    }
    return { endOffset: this.#endOffset, endBytes: this.#endBytes, nonZeroAfterEnd: this.#nonZeroAfterEnd };
  }

  #afterEnd(bytes: Uint8Array): void {
    this.#endBytes += bytes.length;
    if (!this.#nonZeroAfterEnd && bytes.some((byte) => byte !== 0)) {
      this.#nonZeroAfterEnd = true;
    }
  }

  #take(count: number): Uint8Array {
    const bytes = concat(this.#pending);
    const rest = bytes.subarray(count);
    this.#pending = rest.length === 0 ? [] : [rest];
    this.#pendingLength = rest.length;
    return bytes.subarray(0, count);
  }
}
