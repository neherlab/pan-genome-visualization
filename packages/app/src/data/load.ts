/** Fetch and parse of the JSON files of the data root, with one in-memory copy per URL for the life of the page. */

import { z } from "zod";

/** Why a data file failed to load. */
export type DataErrorReason =
  | { readonly kind: "network"; readonly message: string }
  | { readonly kind: "status"; readonly status: number; readonly statusText: string }
  | { readonly kind: "json"; readonly message: string }
  | { readonly kind: "schema"; readonly message: string };

/** A data file that failed to load, with its URL and the reason. */
export class DataError extends Error {
  readonly url: string;
  readonly reason: DataErrorReason;

  constructor(url: string, reason: DataErrorReason, options?: ErrorOptions) {
    super(`${url}: ${describeReason(reason)}`, options);
    this.name = "DataError";
    this.url = url;
    this.reason = reason;
  }
}

/** Return a sentence that names the reason of a failed load. */
export function describeReason(reason: DataErrorReason): string {
  switch (reason.kind) {
    case "network":
      return `the request failed (${reason.message})`;
    case "status":
      return `the server answered ${reason.status}${reason.statusText ? ` ${reason.statusText}` : ""}`;
    case "json":
      return `the file is not valid JSON (${reason.message})`;
    case "schema":
      return `the file does not follow the data format:\n${reason.message}`;
  }
}

/**
 * Return a loader of the JSON files of one schema: it fetches a URL, checks its status and its schema, and returns
 * the parsed value. Each URL loads once per page; a failed load is not kept, so a later call tries again. The loader
 * throws a `DataError`.
 */
export function jsonLoader<T>(schema: z.ZodType<T>): (url: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (url) => {
    const cached = cache.get(url);
    if (cached !== undefined) {
      return cached;
    }
    const loading = fetchJson(url, schema);
    cache.set(url, loading);
    loading.catch(() => cache.delete(url));
    return loading;
  };
}

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new DataError(url, { kind: "network", message: errorMessage(error) }, { cause: error });
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new DataError(url, { kind: "status", status: response.status, statusText: response.statusText });
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new DataError(url, { kind: "json", message: errorMessage(error) }, { cause: error });
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new DataError(url, { kind: "schema", message: z.prettifyError(parsed.error) }, { cause: parsed.error });
  }
  return parsed.data;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
