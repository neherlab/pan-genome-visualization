/** Reader of POSIX ustar archives that hold regular files only, the tar format of the pack and the downloads. */

const BLOCK = 512;

/** One regular file of a ustar archive. */
export interface UstarEntry {
  /** Path: the `prefix` field, `/`, and the `name` field, or the `name` field alone when `prefix` is empty. */
  readonly name: string;
  readonly mode: number;
  readonly uid: number;
  readonly gid: number;
  /** Modification time in seconds since 1970-01-01 UTC. */
  readonly mtime: number;
  readonly uname: string;
  readonly gname: string;
  readonly data: Uint8Array;
}

/** The entries of an archive, and where the archive ends. */
export interface UstarArchive {
  readonly entries: readonly UstarEntry[];
  /** Byte offset of the first zero block (the end marker), or `null` when the bytes end after the last entry. */
  readonly endOffset: number | null;
}

/** A violation of the ustar rules, with the byte offset of the header that breaks them. */
export class UstarError extends Error {
  override readonly name = "UstarError";
  readonly offset: number;

  constructor(message: string, offset: number) {
    super(`${message} (tar header at byte ${offset})`);
    this.offset = offset;
  }
}

const UTF8 = new TextDecoder("utf-8", { fatal: true });

function field(header: Uint8Array, start: number, length: number): Uint8Array {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return end === -1 ? bytes : bytes.subarray(0, end);
}

function text(header: Uint8Array, start: number, length: number, what: string, offset: number): string {
  try {
    return UTF8.decode(field(header, start, length));
  } catch {
    throw new UstarError(`${what} is not UTF-8`, offset);
  }
}

/** Parse an octal number field: octal digits, optionally padded with leading spaces and ended by NUL or space. */
function octal(header: Uint8Array, start: number, length: number, what: string, offset: number): number {
  const digits = String.fromCharCode(...field(header, start, length)).trim();
  if (!/^[0-7]+$/.test(digits)) {
    throw new UstarError(`${what} is no octal number`, offset);
  }
  return Number.parseInt(digits, 8);
}

function isZeroBlock(block: Uint8Array): boolean {
  return block.every((byte) => byte === 0);
}

/** Sum of the header bytes with the checksum field read as 8 spaces. */
function headerChecksum(header: Uint8Array): number {
  let sum = 0;
  header.forEach((byte, index) => {
    sum += index >= 148 && index < 156 ? 0x20 : byte;
  });
  return sum;
}

function parseHeader(bytes: Uint8Array, offset: number): Omit<UstarEntry, "data"> & { readonly size: number } {
  const header = bytes.subarray(offset, offset + BLOCK);
  if (octal(header, 148, 8, "checksum", offset) !== headerChecksum(header)) {
    throw new UstarError("header checksum mismatch", offset);
  }
  if (String.fromCharCode(...header.subarray(257, 265)) !== "ustar\u000000") {
    throw new UstarError("header is not ustar (magic `ustar\\0`, version `00`)", offset);
  }
  const type = String.fromCharCode(header[156] ?? 0);
  if (type !== "0") {
    throw new UstarError(`entry type ${JSON.stringify(type)} is no regular file (type 0)`, offset);
  }
  const name = text(header, 0, 100, "name", offset);
  const prefix = text(header, 345, 155, "prefix", offset);
  return {
    name: prefix === "" ? name : `${prefix}/${name}`,
    mode: octal(header, 100, 8, "mode", offset),
    uid: octal(header, 108, 8, "uid", offset),
    gid: octal(header, 116, 8, "gid", offset),
    size: octal(header, 124, 12, "size", offset),
    mtime: octal(header, 136, 12, "mtime", offset),
    uname: text(header, 265, 32, "uname", offset),
    gname: text(header, 297, 32, "gname", offset),
  };
}

/**
 * Parse a ustar archive: 512-byte headers with octal fields, the `prefix` field, regular files (type `0`) only,
 * data padded to 512 bytes. Stop at the first zero block. Throw `UstarError` on any other header or on truncation.
 */
export function parseUstar(bytes: Uint8Array): UstarArchive {
  const entries: UstarEntry[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes.length - offset < BLOCK) {
      throw new UstarError("archive ends inside a header", offset);
    }
    if (isZeroBlock(bytes.subarray(offset, offset + BLOCK))) {
      return { entries, endOffset: offset };
    }
    const { size, ...entry } = parseHeader(bytes, offset);
    const start = offset + BLOCK;
    const next = start + Math.ceil(size / BLOCK) * BLOCK;
    if (next > bytes.length) {
      throw new UstarError(`archive ends inside the data of "${entry.name}"`, offset);
    }
    entries.push({ ...entry, data: bytes.subarray(start, start + size) });
    offset = next;
  }
  return { entries, endOffset: null };
}
