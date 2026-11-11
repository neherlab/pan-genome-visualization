/** Readers and writers of the text files of a dataset: FASTA record identifiers, Newick tips, and metadata.tsv. */

import type { Dataset } from "../schemas";

/** Identifier of the consensus record that may start a reduced alignment. */
export const CONSENSUS = "consensus";

/** Return the record identifiers of a FASTA text: each header line after `>`, up to the first space. */
export function fastaIds(text: string): string[] {
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith(">")) {
      ids.push(line.slice(1).split(" ", 1)[0] ?? "");
    }
  }
  return ids;
}

/** Return the accession of a record identifier `<accession>|<locus_tag>`. */
export function accessionOf(id: string): string {
  const bar = id.indexOf("|");
  return bar === -1 ? id : id.slice(0, bar);
}

/** An unquoted Newick label: every character except white space and the structure characters. */
const UNQUOTED_LABEL = /[^\s()[\]',:;]+/y;

type NewickToken = "(" | ")" | "," | ":" | ";" | { readonly label: string };

/** Split a Newick text into structure characters and labels; quoted labels lose their quotes, comments are dropped. */
function newickTokens(text: string): NewickToken[] {
  const tokens: NewickToken[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text.charAt(index);
    if (char === "(" || char === ")" || char === "," || char === ":" || char === ";") {
      tokens.push(char);
      index += 1;
    } else if (char === "[") {
      const end = text.indexOf("]", index);
      if (end === -1) {
        throw new Error("Newick comment `[` has no end");
      }
      index = end + 1;
    } else if (char === "'") {
      let label = "";
      index += 1;
      for (;;) {
        const end = text.indexOf("'", index);
        if (end === -1) {
          throw new Error("quoted Newick label has no end");
        }
        label += text.slice(index, end);
        index = end + 1;
        if (text.charAt(index) !== "'") {
          break;
        }
        label += "'";
        index += 1;
      }
      tokens.push({ label });
    } else if (/\s/.test(char)) {
      index += 1;
    } else {
      UNQUOTED_LABEL.lastIndex = index;
      const label = UNQUOTED_LABEL.exec(text)?.[0] ?? char;
      tokens.push({ label });
      index += label.length;
    }
  }
  return tokens;
}

/**
 * Return the tip names of a Newick tree in text order: the labels of the nodes that open with no `(`. A tip without a
 * label gives `""`. Throw on unbalanced parentheses or text after the closing `;`.
 */
export function newickTips(text: string): string[] {
  const tips: string[] = [];
  let depth = 0;
  let previous: NewickToken | undefined;
  let ended = false;
  for (const token of newickTokens(text)) {
    if (ended) {
      throw new Error("Newick text continues after `;`");
    }
    const startsNode = previous === undefined || previous === "(" || previous === ",";
    if (typeof token === "object") {
      if (startsNode) {
        tips.push(token.label);
      }
    } else if (token === "(") {
      depth += 1;
    } else {
      if (startsNode && token !== ";") {
        tips.push("");
      }
      if (token === ")") {
        depth -= 1;
        if (depth < 0) {
          throw new Error("Newick `)` without `(`");
        }
      } else if (token === ";") {
        ended = true;
      }
    }
    previous = token;
  }
  if (depth !== 0 || !ended) {
    throw new Error("Newick tree is not closed by `)` and `;`");
  }
  return tips;
}

/** Return a TSV field: in double quotes with each `"` doubled when it holds a tab, a line break, or `"`. */
function tsvField(value: string | null): string {
  if (value === null) {
    return "";
  }
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Return `metadata.tsv` of a dataset: the header `accession`, `strain`, and the metadata keys, then one row per strain,
 * with empty fields for unknown values and a `null` strain, and LF after every row (docs/data-format.md, "Other
 * downloads").
 */
export function renderMetadataTsv(dataset: Pick<Dataset, "metadata" | "strains">): string {
  const keys = dataset.metadata.map((column) => column.key);
  const rows = [
    ["accession", "strain", ...keys],
    ...dataset.strains.map((strain) => [
      strain.accession,
      strain.strain,
      ...keys.map((key) => strain.values[key] ?? null),
    ]),
  ];
  return rows.map((row) => `${row.map(tsvField).join("\t")}\n`).join("");
}
