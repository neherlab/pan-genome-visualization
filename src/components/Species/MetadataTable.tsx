import React, { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { MetadataEntry, SpeciesDesc, useSpeciesMetadata } from 'src/hooks/useDataIndexQuery'
import { Table } from 'src/components/Table/Table'
import { getColumnDefNames } from 'src/components/Table/helpers'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

const METADATA_TABLE_COLUMNS: ColumnDef<MetadataEntry>[] = [
  {
    header: 'Accession',
    accessorFn: (meta) => meta.accession,
    size: 100,
    cell: (context) => <NuccoreUrl accession={context.getValue<string>()} />,
  },
  {
    header: 'Strain',
    accessorFn: (meta) => meta.strain,
    size: 100,
  },
  {
    header: 'Collection date',
    accessorFn: (meta) => meta.collection_date,
    size: 100,
  },
  {
    header: 'Country',
    accessorFn: (meta) => meta.country,
    size: 100,
  },
  {
    header: 'Host',
    accessorFn: (meta) => meta.host,
    size: 100,
  },
  {
    header: 'Organism',
    accessorFn: (meta) => meta.organism,
  },
]

const METADATA_TABLE_COLUMN_ORDER = getColumnDefNames(METADATA_TABLE_COLUMNS)

const METADATA_TABLE_SEARCH_KEYS: Extract<keyof MetadataEntry, string>[] = [
  'accession',
  'strain',
  'collection_date',
  'country',
  'host',
  'organism',
]

export interface MetadataTableProps {
  species: SpeciesDesc
}

export function MetadataTable({ species }: MetadataTableProps) {
  const { t } = useTranslationSafe()
  const metadata = useSpeciesMetadata(species.id)

  return (
    <Table
      title={t('Select metadata')}
      searchTitle={t('Search metadata')}
      data_={metadata}
      columns_={METADATA_TABLE_COLUMNS}
      initialColumnOrder={METADATA_TABLE_COLUMN_ORDER}
      searchKeys={METADATA_TABLE_SEARCH_KEYS}
    />
  )
}

export interface NuccoreUrlProps {
  accession: string
}

export function NuccoreUrl({ accession }: NuccoreUrlProps) {
  const { t } = useTranslationSafe()
  const href = useMemo(() => `https://www.ncbi.nlm.nih.gov/nuccore/${accession}`, [accession])
  const title = useMemo(() => t('Open in NCBI Nuccore'), [t])
  return (
    <LinkExternal href={href} title={title}>
      {accession}
    </LinkExternal>
  )
}
