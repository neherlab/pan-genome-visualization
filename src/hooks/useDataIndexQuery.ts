import { get, mapValues } from 'lodash'
import { useMemo } from 'react'
import urljoin from 'url-join'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { useAxiosQuery, UseAxiosQueryOptions, useAxiosTarQuery, useAxiosCsvQuery } from 'src/hooks/useAxiosQuery'

export interface SpeciesDesc {
  id: string
  name: string
  description: string
  num_strains?: string
  source?: string
}

export function speciesEquals(left: SpeciesDesc, right: SpeciesDesc): boolean {
  return left.id === right.id
}

export interface DataIndexJson {
  created_at: string
  orders: SpeciesDesc[]
  case_studies: SpeciesDesc[]
  species: SpeciesDesc[]
}

export interface GeneCluster {
  archive: string
  archive_files: GeneClusterDataRaw
  divers: number
  dup_detail?: string
  dupli?: string
  id: number
  length: number
  locus: string
  mnemonic: string
  name: string
  num_events: number
  num_strains: number
}

export interface GeneClusterDataRaw {
  aa_aln?: string
  aa_aln_reduced?: string
  na_aln?: string
  na_aln_reduced?: string
  nwk?: string
  patterns_json?: string
  tree_json?: string
}

export interface TreeNodeOld {
  name: string
  branch_length?: number
  clade?: string
  accession?: string
  attr?: {
    strain?: string
    collection_date?: string
    country?: string
    host?: string
    organism?: string
    [k: string]: unknown
  }
  children?: TreeNodeOld[]
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TreeMetadataOld {}

export interface GeneClusterData {
  aa_aln?: string
  aa_aln_reduced?: string
  na_aln?: string
  na_aln_reduced?: string
  nwk?: string
  patterns?: Record<string, unknown>
  tree?: TreeNodeOld
  meta?: TreeMetadataOld
}

export function geneClusterEquals(left: GeneCluster, right: GeneCluster): boolean {
  return left.id === right.id
}

export function geneClusterGetId(cluster: GeneCluster) {
  return cluster.id
}

export interface GeneClusterJson {
  created_at: string
  clusters: GeneCluster[]
}

export function getDataRootUrl(): string {
  const DATA_ROOT_URL = process.env.DATA_ROOT_URL // eslint-disable-line prefer-destructuring
  if (!DATA_ROOT_URL) {
    throw new ErrorInternal('The variable "DATA_ROOT_URL" is not set.')
  }
  return DATA_ROOT_URL
}

export function getDataIndexJsonUrl(): string {
  return urljoin(getDataRootUrl(), 'index.json')
}

export function useDataIndexQuery(options?: UseAxiosQueryOptions<DataIndexJson>): DataIndexJson {
  return useAxiosQuery<DataIndexJson>(getDataIndexJsonUrl(), options)
}

export function useGeneClusterJson(speciesId: string, options?: UseAxiosQueryOptions<GeneClusterJson>) {
  return useAxiosQuery<GeneClusterJson>(urljoin(getDataRootUrl(), 'dataset', speciesId, 'gene_cluster.json'), options)
}

export interface MetadataEntry {
  accession?: string
  strain?: string
  collection_date?: string
  country?: string
  host?: string
  organism?: string
}

export function metadataEntryEquals(left: MetadataEntry, right: MetadataEntry) {
  return left.accession === right.accession
}

export function useSpeciesMetadata(speciesId: string, options?: UseAxiosQueryOptions<MetadataEntry[]>) {
  const url = useMemo(() => urljoin(getDataRootUrl(), 'dataset', speciesId, 'metainfo.tsv'), [speciesId])
  return useAxiosCsvQuery<MetadataEntry>(url, '\t', options)
}

export interface SpeciesTree {
  tree: TreeNodeOld
  meta: TreeMetadataOld
}

export function useSpeciesTreeJson(speciesId: string, options?: UseAxiosQueryOptions<SpeciesTree>) {
  const url = useMemo(() => urljoin(getDataRootUrl(), 'dataset', speciesId, 'strain_tree.json'), [speciesId])
  return useAxiosQuery(url, options)
}

export function useGeneClusterData(
  species: SpeciesDesc,
  cluster: GeneCluster,
  options?: UseAxiosQueryOptions<Record<string, string>>,
): GeneClusterData {
  const archiveUrl = useMemo(
    () => urljoin(getDataRootUrl(), 'dataset', species.id, cluster.archive),
    [cluster.archive, species.id],
  )

  const clusterArchive = useAxiosTarQuery(archiveUrl, options)

  const { aa_aln, aa_aln_reduced, na_aln, na_aln_reduced, nwk, patterns_json, tree_json } = useMemo(
    () =>
      mapValues(cluster.archive_files, (filename) => {
        if (!filename) {
          return undefined
        }
        const content = get(clusterArchive, filename, undefined)
        if (!content) {
          throw new ErrorInternal(`File ${filename} not found in data archive`)
        }
        return content
      }),
    [cluster.archive_files, clusterArchive],
  )

  return {
    aa_aln,
    aa_aln_reduced,
    na_aln,
    na_aln_reduced,
    nwk,
    patterns: patterns_json ? (JSON.parse(patterns_json) as Record<string, unknown>) : undefined,
    tree: tree_json ? (JSON.parse(tree_json) as TreeNodeOld) : undefined,
    meta: {} as TreeMetadataOld,
  }
}
