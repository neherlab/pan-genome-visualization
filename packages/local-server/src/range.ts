/** The `Range` header as S3 answers it, for the data host. */

/** How to answer a request for an object of `size` bytes. */
export type RangeAnswer =
  | { readonly kind: "whole" }
  | { readonly kind: "partial"; readonly first: number; readonly last: number }
  | { readonly kind: "unsatisfiable" };

const SINGLE_RANGE = /^bytes=(\d*)-(\d*)$/;

/**
 * Return the answer to a `Range` header: the whole object without a header, for several ranges, and for a header that
 * does not parse; the bytes from `first` to `last` for one range, its end cut at the end of the object; unsatisfiable
 * for a range that starts at or beyond the end, or a suffix of zero bytes.
 */
export function answerRange(header: string | null, size: number): RangeAnswer {
  if (header === null) {
    return { kind: "whole" };
  }
  const match = SINGLE_RANGE.exec(header.trim());
  if (match === null) {
    return { kind: "whole" };
  }
  const [, firstText = "", lastText = ""] = match;
  if (firstText === "") {
    if (lastText === "") {
      return { kind: "whole" };
    }
    const suffix = Number(lastText);
    if (suffix === 0 || size === 0) {
      return { kind: "unsatisfiable" };
    }
    return { kind: "partial", first: Math.max(0, size - suffix), last: size - 1 };
  }
  const first = Number(firstText);
  const last = lastText === "" ? size - 1 : Number(lastText);
  if (last < first) {
    return { kind: "whole" };
  }
  if (first >= size) {
    return { kind: "unsatisfiable" };
  }
  return { kind: "partial", first, last: Math.min(last, size - 1) };
}
