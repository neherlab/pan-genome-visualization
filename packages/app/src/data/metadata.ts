/**
 * The metadata of `dataset.json` in the shapes that the viewer modules read: the column configuration
 * (`metaDisplay`), the values of each column (`metaDetails`), and the attributes of the strain tree tips.
 */

import type { Dataset, MetadataColumn, Strain } from "@panx/data-format";

/** The text that the views show and compare for an unknown value. */
export const UNKNOWN = "unknown";

/** Colour option of a metadata column: one colour per value, or a colour scale over the numbers of the values. */
export type ColorOption =
  | { readonly menuItem: string; readonly type: "discrete" }
  | { readonly menuItem: string; readonly type: "mixed_continuous"; readonly scale: "linear" | "log2" };

/** The columns of the metadata table in display order, and the colour option of each `discrete` and `continuous` column. */
export interface MetaDisplay {
  readonly meta_display_order: readonly string[];
  readonly color_options: Readonly<Record<string, ColorOption>>;
}

/**
 * The values of each colour column: the distinct strings of a `discrete` column, with `unknown` for a missing value,
 * and the pairs `[value, number]` of a `continuous` column.
 */
export type MetaDetails = Record<string, string[] | [string, number][]>;

/** Return the column configuration of a dataset; `text` columns have no colour option. */
export function metaDisplayOf(dataset: Dataset): MetaDisplay {
  const options: Record<string, ColorOption> = {};
  for (const column of dataset.metadata) {
    const option = colorOptionOf(column);
    if (option !== undefined) {
      options[column.key] = option;
    }
  }
  return { meta_display_order: dataset.metadata.map((column) => column.key), color_options: options };
}

function colorOptionOf(column: MetadataColumn): ColorOption | undefined {
  switch (column.type) {
    case "discrete":
      return { menuItem: column.key, type: "discrete" };
    case "continuous":
      return { menuItem: column.key, type: "mixed_continuous", scale: column.scale };
    case "text":
      return undefined;
  }
}

/** Return the values of each colour column, in the order of their first strain. */
export function metaDetailsOf(dataset: Dataset): MetaDetails {
  const details: MetaDetails = {};
  for (const column of dataset.metadata) {
    if (column.type === "text") {
      continue;
    }
    const values = distinct(dataset.strains.map((strain) => strain.values[column.key] ?? null));
    if (column.type === "discrete") {
      details[column.key] = values.map((value) => value ?? UNKNOWN);
    } else {
      const pairs: [string, number][] = [];
      for (const value of values) {
        const number = value === null ? undefined : column.numbers[value];
        if (value !== null && number !== undefined) {
          pairs.push([value, number]);
        }
      }
      details[column.key] = pairs;
    }
  }
  return details;
}

/** Return the attributes of the strain tree tip of a strain: its strain name and every metadata value, `unknown` for a missing one. */
export function tipAttributesOf(strain: Strain, dataset: Dataset): Record<string, string> {
  const attributes: Record<string, string> = { strain: strain.strain ?? UNKNOWN };
  for (const column of dataset.metadata) {
    attributes[column.key] = strain.values[column.key] ?? UNKNOWN;
  }
  return attributes;
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
