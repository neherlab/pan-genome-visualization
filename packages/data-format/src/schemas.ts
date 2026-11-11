/**
 * Zod schemas and types of the JSON files of format 1 (docs/data-format.md). Every object passes unknown fields,
 * because a release may add fields within format 1. Each schema also checks the rules that hold inside its file;
 * the rules across files belong to the verifier.
 */

import { z } from "zod";

import { CLUSTER_ID_PATTERN, DATASET_ID_PATTERN, RELEASE_ID_PATTERN } from "./paths";

const FORMAT = z.literal(1).meta({ description: "Format of the data files" });
const ReleaseId = z
  .string()
  .regex(RELEASE_ID_PATTERN)
  .meta({ description: "UTC creation time, ISO 8601 basic format" });
const DatasetId = z.string().regex(DATASET_ID_PATTERN);
const ClusterId = z.string().regex(CLUSTER_ID_PATTERN);
const Count = z.int().nonnegative();
const PositiveCount = z.int().positive();
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);
/** `<accession>|<locus_tag>`, the identifier of a FASTA record. */
const Locus = z.string().regex(/^[^\s|]+\|\S+$/);

/** Add an issue for each value that occurs more than once. */
function checkUnique(
  ctx: z.core.$RefinementCtx,
  values: readonly string[],
  path: readonly PropertyKey[],
  what: string,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: "custom", message: `duplicate ${what} "${value}"`, path: [...path, index] });
    }
    seen.add(value);
  });
}

/** Return the values of `values` that `exclude` lacks, in their order (the app supports browsers without `Set.difference`). */
function without<T>(values: ReadonlySet<T>, exclude: ReadonlySet<T>): T[] {
  return [...values].filter((value) => !exclude.has(value));
}

// releases.json

export const ReleaseEntry = z.looseObject({
  id: ReleaseId,
  format: PositiveCount.meta({ description: "Format of every file of the release" }),
  title: z.string(),
});
export type ReleaseEntry = z.infer<typeof ReleaseEntry>;

export const Releases = z
  .looseObject({
    format: FORMAT,
    default: ReleaseId.meta({ description: "The release that the app shows without ?release=; a listed release" }),
    releases: z.array(ReleaseEntry).min(1).meta({ description: "Every live release, newest first" }),
  })
  .superRefine((file, ctx) => {
    file.releases.forEach((entry, index) => {
      const previous = file.releases[index - 1];
      if (previous !== undefined && previous.id <= entry.id) {
        ctx.addIssue({ code: "custom", message: "releases are not newest first", path: ["releases", index, "id"] });
      }
    });
    if (!file.releases.some((entry) => entry.id === file.default)) {
      ctx.addIssue({ code: "custom", message: `default release "${file.default}" is not listed`, path: ["default"] });
    }
  })
  .meta({ title: "releases.json", description: "The live releases of a data root" });
export type Releases = z.infer<typeof Releases>;

// <release>/index.json

export const Category = z.looseObject({ id: z.string(), label: z.string() });
export type Category = z.infer<typeof Category>;

export const DatasetEntry = z.looseObject({
  id: DatasetId,
  name: z.string().meta({ description: "Name in the species search and the downloads table" }),
  label: z.string().meta({ description: "Text in the dataset dropdown" }),
  category: z.string().meta({ description: "Id of a listed category" }),
  source: z.string().meta({ description: "Source column of the downloads table" }),
  strains: PositiveCount,
  clusters: Count,
});
export type DatasetEntry = z.infer<typeof DatasetEntry>;

export const ReleaseIndex = z
  .looseObject({
    format: FORMAT,
    release: ReleaseId,
    categories: z.array(Category).meta({ description: "Dataset groups in display order" }),
    datasets: z.array(DatasetEntry).meta({ description: "Datasets in display order" }),
  })
  .superRefine((file, ctx) => {
    checkUnique(
      ctx,
      file.categories.map((category) => category.id),
      ["categories"],
      "category id",
    );
    checkUnique(
      ctx,
      file.datasets.map((dataset) => dataset.id),
      ["datasets"],
      "dataset id",
    );
    const categories = new Set(file.categories.map((category) => category.id));
    file.datasets.forEach((dataset, index) => {
      if (!categories.has(dataset.category)) {
        ctx.addIssue({
          code: "custom",
          message: `category "${dataset.category}" is not listed`,
          path: ["datasets", index, "category"],
        });
      }
    });
  })
  .meta({ title: "index.json", description: "The datasets of a release" });
export type ReleaseIndex = z.infer<typeof ReleaseIndex>;

// <release>/manifest.json

export const Build = z.looseObject({
  repository: z.literal("https://github.com/neherlab/pan-genome-analysis"),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  uncommitted_changes: z.boolean(),
  python: z.string(),
  zlib: z.string(),
  snapshot: Sha256.meta({ description: "SHA-256 of the MD5SUMS file of the input snapshot" }),
  recipe: Sha256.meta({ description: "SHA-256 of the recipe file" }),
});
export type Build = z.infer<typeof Build>;

export const ManifestObject = z.looseObject({
  path: z.string().meta({ description: "Path relative to the release folder" }),
  size: Count,
  sha256: Sha256,
  contentType: z.string(),
  contentEncoding: z.literal("gzip").nullable(),
  cacheControl: z.string(),
  contentDisposition: z.string().nullable(),
});
export type ManifestObject = z.infer<typeof ManifestObject>;

export const Manifest = z
  .looseObject({
    format: FORMAT,
    release: ReleaseId,
    build: Build,
    objects: z.array(ManifestObject).meta({ description: "Every object of the release folder except manifest.json" }),
  })
  .superRefine((file, ctx) => {
    checkUnique(
      ctx,
      file.objects.map((object) => object.path),
      ["objects"],
      "path",
    );
  })
  .meta({ title: "manifest.json", description: "The objects of a release and the build that wrote them" });
export type Manifest = z.infer<typeof Manifest>;

// <release>/<dataset>/dataset.json

export interface StrainTreeNode {
  name: string;
  branch_length: number;
  children?: StrainTreeNode[] | undefined;
  [key: string]: unknown;
}

export const StrainTreeNode: z.ZodType<StrainTreeNode> = z
  .looseObject({
    name: z.string(),
    branch_length: z.number().nonnegative(),
    get children() {
      return z.array(StrainTreeNode).min(1).optional();
    },
  })
  .meta({ id: "StrainTreeNode", description: "Inner nodes have children, tips have none" });

export const MetadataColumn = z.discriminatedUnion("type", [
  z.looseObject({ key: z.string(), type: z.literal("discrete") }),
  z.looseObject({
    key: z.string(),
    type: z.literal("continuous"),
    scale: z.enum(["linear", "log2"]),
    numbers: z.record(z.string(), z.number()).meta({ description: "Number of each value; other values are unknown" }),
  }),
  z.looseObject({ key: z.string(), type: z.literal("text") }),
]);
export type MetadataColumn = z.infer<typeof MetadataColumn>;

export const Strain = z.looseObject({
  accession: z.string(),
  strain: z.string().nullable(),
  values: z.record(z.string(), z.string().nullable()).meta({ description: "Value of every metadata key" }),
});
export type Strain = z.infer<typeof Strain>;

export const ClusterColumn = z.looseObject({
  key: z.string(),
  label: z.string(),
  group: z.string(),
  description: z.string(),
});
export type ClusterColumn = z.infer<typeof ClusterColumn>;

/** Return the nodes of a tree in pre-order: the root first, then the children in array order. */
export function preOrder<T extends { children?: readonly T[] | undefined }>(root: T): T[] {
  const nodes: T[] = [];
  const stack = [root];
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    nodes.push(node);
    const children = node.children ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child !== undefined) {
        stack.push(child);
      }
    }
  }
  return nodes;
}

export const Dataset = z
  .looseObject({
    format: FORMAT,
    id: DatasetId,
    strain_tree: StrainTreeNode,
    metadata: z.array(MetadataColumn).meta({ description: "Metadata columns in display order" }),
    strains: z.array(Strain),
    cluster_columns: z.array(ClusterColumn).meta({ description: "Extra cluster table columns after Length" }),
    accession_url: z
      .string()
      .includes("{accession}")
      .nullable()
      .meta({ description: "URL template of an accession page, or null when accessions have no public page" }),
  })
  .superRefine((file, ctx) => {
    const nodes = preOrder(file.strain_tree);
    checkUnique(
      ctx,
      nodes.map((node) => node.name),
      ["strain_tree"],
      "tree node name",
    );
    checkUnique(
      ctx,
      file.strains.map((strain) => strain.accession),
      ["strains"],
      "accession",
    );
    const accessions = new Set(file.strains.map((strain) => strain.accession));
    const tips = new Set(nodes.filter((node) => node.children === undefined).map((node) => node.name));
    for (const tip of without(tips, accessions)) {
      ctx.addIssue({ code: "custom", message: `strain tree tip "${tip}" is no strain`, path: ["strain_tree"] });
    }
    for (const accession of without(accessions, tips)) {
      ctx.addIssue({ code: "custom", message: `strain "${accession}" is no strain tree tip`, path: ["strains"] });
    }

    checkUnique(
      ctx,
      file.metadata.map((column) => column.key),
      ["metadata"],
      "metadata key",
    );
    const keys = new Set(file.metadata.map((column) => column.key));
    file.strains.forEach((strain, index) => {
      const valueKeys = new Set(Object.keys(strain.values));
      for (const key of without(keys, valueKeys)) {
        ctx.addIssue({
          code: "custom",
          message: `no value for metadata key "${key}"`,
          path: ["strains", index, "values"],
        });
      }
      for (const key of without(valueKeys, keys)) {
        ctx.addIssue({
          code: "custom",
          message: `value for unknown key "${key}"`,
          path: ["strains", index, "values", key],
        });
      }
    });
    file.metadata.forEach((column, index) => {
      if (column.type !== "continuous") {
        return;
      }
      const values = new Set(file.strains.map((strain) => strain.values[column.key]));
      for (const value of Object.keys(column.numbers)) {
        if (!values.has(value)) {
          ctx.addIssue({
            code: "custom",
            message: `number for "${value}", which no strain has in column "${column.key}"`,
            path: ["metadata", index, "numbers", value],
          });
        }
      }
    });

    checkUnique(
      ctx,
      file.cluster_columns.map((column) => column.key),
      ["cluster_columns"],
      "cluster column key",
    );
  })
  .meta({
    title: "dataset.json",
    description: "Strain tree, strains, metadata columns, and cluster columns of a dataset",
  });
export type Dataset = z.infer<typeof Dataset>;

// <release>/<dataset>/clusters.json

/** `[name, count]`; the name is null for genes without one. */
const NameCount = z.tuple([z.string().nullable(), PositiveCount]);

export const Cluster = z.looseObject({
  id: ClusterId,
  kind: z.enum(["protein", "rna"]).meta({ description: "rna: the cluster has no amino-acid alignment" }),
  strains: PositiveCount.meta({ description: "Number of strains that have the gene" }),
  length: Count.meta({ description: "Mean gene length in nucleotides" }),
  annotation: z.string().nullable(),
  gene: z.string().nullable(),
  annotations: z.array(NameCount),
  genes: z.array(NameCount),
  duplications: z
    .array(z.tuple([z.string(), z.int().min(2)]))
    .meta({ description: "[accession, copies] for each strain with more than one copy" }),
  events: Count.meta({ description: "Number of gain and loss events" }),
  diversity: z.number().nullable(),
  range: z
    .tuple([Count, Count])
    .meta({ description: "Inclusive byte range [first, last] of the cluster's member in gene_clusters.tar.gz" }),
  extra: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
});
export type Cluster = z.infer<typeof Cluster>;
export type ClusterKind = Cluster["kind"];

export const Clusters = z
  .looseObject({
    format: FORMAT,
    clusters: z.array(Cluster).meta({ description: "Clusters in descending strain count" }),
  })
  .superRefine((file, ctx) => {
    checkUnique(
      ctx,
      file.clusters.map((cluster) => cluster.id),
      ["clusters"],
      "cluster id",
    );
    let next = 0;
    file.clusters.forEach((cluster, index) => {
      const [first, last] = cluster.range;
      if (first !== next || last < first) {
        ctx.addIssue({
          code: "custom",
          message: `range [${first}, ${last}] does not start at byte ${next}`,
          path: ["clusters", index, "range"],
        });
      }
      next = last + 1;
    });
  })
  .meta({ title: "clusters.json", description: "The cluster table of a dataset" });
export type Clusters = z.infer<typeof Clusters>;

// <release>/<dataset>/loci.json

export const Loci = z
  .looseObject({
    format: FORMAT,
    loci: z.array(z.array(Locus)).meta({ description: "loci[i]: the genes of clusters[i] as <accession>|<locus_tag>" }),
  })
  .meta({ title: "loci.json", description: "The genes of each cluster of a dataset" });
export type Loci = z.infer<typeof Loci>;

// <dataset>/geneCluster/<id>_tree.json and <id>_patterns.json, inside gene_clusters.tar.gz

export interface GeneTreeNode {
  name: string;
  branch_length: number;
  children?: GeneTreeNode[] | undefined;
  accession?: string | undefined;
  muts?: string | undefined;
  aa_muts?: string | undefined;
  annotation?: string | undefined;
  [key: string]: unknown;
}

const GeneTreeNodeShape: z.ZodType<GeneTreeNode> = z
  .looseObject({
    name: z.string(),
    branch_length: z.number(),
    get children() {
      return z.array(GeneTreeNodeShape).min(1).optional();
    },
    accession: z.string().optional().meta({ description: "Strain accession of a tip" }),
    muts: z.string().optional().meta({ description: "Comma-separated nucleotide mutations, such as A23T,C56T" }),
    aa_muts: z.string().optional().meta({ description: "Comma-separated amino-acid mutations" }),
    annotation: z.string().optional(),
  })
  .meta({ id: "GeneTreeNode", description: "Inner nodes have children, tips have an accession" });

export const GeneTree = GeneTreeNodeShape.superRefine((root, ctx) => {
  for (const node of preOrder(root)) {
    if ((node.children === undefined) === (node.accession === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: `gene tree node "${node.name}" needs either children or an accession`,
        path: [],
      });
    }
  }
}).meta({ title: "<id>_tree.json", description: "The gene tree of a cluster" });
export type GeneTree = z.infer<typeof GeneTree>;

export const Patterns = z
  .looseObject({
    patterns: z
      .string()
      .regex(/^[0-3]*$/)
      .meta({
        description:
          "One character per non-root strain tree node in pre-order: 3 present, 0 absent, 1 gained, 2 lost on the branch to the node",
      }),
  })
  .meta({ title: "<id>_patterns.json", description: "The gain and loss pattern of a cluster" });
export type Patterns = z.infer<typeof Patterns>;

/** The schema of each JSON file, keyed by the name of its JSON Schema file `<key>.schema.json`. */
export const FILE_SCHEMAS = {
  releases: Releases,
  index: ReleaseIndex,
  manifest: Manifest,
  dataset: Dataset,
  clusters: Clusters,
  loci: Loci,
  tree: GeneTree,
  patterns: Patterns,
} as const;
