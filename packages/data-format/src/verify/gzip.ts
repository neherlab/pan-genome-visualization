/**
 * Strict reader of one gzip member (RFC 1952), which also tells where the member ends: `DecompressionStream` and
 * `gunzip` of `node:zlib` read every member of a file as one stream, so they cannot show a second member.
 */

import { createInflateRaw, crc32 } from "node:zlib";

/** The gzip header of the format: no flags, mtime 0, XFL 2, OS 255 (docs/data-format.md, "Encodings"). */
export const FIXED_GZIP_HEADER: readonly number[] = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff];

const FHCRC = 0x02;
const FEXTRA = 0x04;
const FNAME = 0x08;
const FCOMMENT = 0x10;
const TRAILER = 8;

/** The first gzip member of some bytes. */
export interface GzipMember {
  /** Whether the member starts with the fixed header of the format. */
  readonly fixedHeader: boolean;
  /** Count of the bytes after the member's trailer. */
  readonly trailing: number;
}

/** Return whether bytes start with the gzip magic number. */
export function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** Return whether bytes start with the fixed gzip header of the format. */
export function hasFixedHeader(bytes: Uint8Array): boolean {
  return FIXED_GZIP_HEADER.every((byte, index) => bytes[index] === byte);
}

/**
 * Decompress the first gzip member of `bytes` and pass its data to `onData` in chunks. Throw when the bytes are no
 * gzip member, the deflate data is corrupt or truncated, or the CRC32 or the size of the trailer is wrong.
 */
export async function gunzipFirstMember(bytes: Uint8Array, onData: (chunk: Uint8Array) => void): Promise<GzipMember> {
  const start = deflateStart(bytes);
  const inflate = createInflateRaw();
  inflate.end(bytes.subarray(start));
  let crc = 0;
  let size = 0;
  for await (const chunk of inflate) {
    if (!(chunk instanceof Uint8Array)) {
      throw new TypeError("inflate gave no bytes");
    }
    crc = crc32(chunk, crc);
    size += chunk.length;
    onData(chunk);
  }
  // The inflater stops at the end of the deflate data; bytesWritten counts the input that it consumed.
  const trailer = start + inflate.bytesWritten;
  if (bytes.length < trailer + TRAILER) {
    throw new Error("gzip member ends before its trailer");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset + trailer, TRAILER);
  if (view.getUint32(0, true) !== crc >>> 0) {
    throw new Error("gzip CRC32 does not match the data");
  }
  if (view.getUint32(4, true) !== size % 2 ** 32) {
    throw new Error("gzip size field does not match the data");
  }
  return { fixedHeader: hasFixedHeader(bytes), trailing: bytes.length - trailer - TRAILER };
}

/** Decompress the first gzip member of `bytes` and return its data with the member facts. */
export async function gunzipMember(bytes: Uint8Array): Promise<GzipMember & { readonly data: Uint8Array }> {
  const chunks: Uint8Array[] = [];
  const member = await gunzipFirstMember(bytes, (chunk) => chunks.push(chunk));
  return { ...member, data: concat(chunks) };
}

/** Return the offset of the deflate data after a gzip header with any flags. */
function deflateStart(bytes: Uint8Array): number {
  if (!isGzip(bytes) || bytes[2] !== 0x08) {
    throw new Error("bytes are no gzip stream (magic 1f 8b, method 8)");
  }
  const flags = bytes[3] ?? 0;
  let offset = 10;
  if (flags & FEXTRA) {
    offset += 2 + (bytes[offset] ?? 0) + ((bytes[offset + 1] ?? 0) << 8);
  }
  for (const flag of [FNAME, FCOMMENT]) {
    if (flags & flag) {
      const end = bytes.indexOf(0, offset);
      if (end === -1) {
        throw new Error("gzip header ends inside a text field");
      }
      offset = end + 1;
    }
  }
  if (flags & FHCRC) {
    offset += 2;
  }
  if (offset > bytes.length) {
    throw new Error("gzip header is truncated");
  }
  return offset;
}

/** Return the bytes of several chunks as one array. */
export function concat(chunks: readonly Uint8Array[]): Uint8Array {
  if (chunks.length === 1 && chunks[0] !== undefined) {
    return chunks[0];
  }
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
