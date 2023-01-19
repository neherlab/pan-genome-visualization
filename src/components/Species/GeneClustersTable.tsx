import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useRecoilState } from 'recoil'
import { alignCenter, alignRight } from 'src/components/Table/TableStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Table } from 'src/components/Table/Table'
import { currentGeneIdAtom } from 'src/state/genes'
import { GeneCluster, geneClusterGetId, SpeciesDesc } from 'src/hooks/useDataIndexQuery'
import { getColumnDefNames } from 'src/components/Table/helpers'

const GENE_CLUSTERS_TABLE_COLUMNS: ColumnDef<GeneCluster>[] = [
  {
    header: 'ID',
    accessorFn: (gene) => gene.id,
    size: 50,
    minSize: 40,
    maxSize: 200,
    cell: alignRight,
  },
  {
    header: 'Mnemonic',
    accessorFn: (gene) => gene.mnemonic,
    size: 100,
    cell: alignCenter,
  },
  {
    header: 'Name',
    accessorFn: (gene) => gene.name,
    size: 250,
  },
  {
    header: 'Strains',
    accessorFn: (gene) => gene.num_strains,
    size: 60,
    minSize: 50,
    maxSize: 200,
    cell: alignRight,
  },
  {
    header: 'Duplicated',
    accessorFn: (gene) => gene.dupli,
    size: 80,
    minSize: 50,
    maxSize: 200,
    cell: alignCenter,
  },
  {
    header: 'Events',
    accessorFn: (gene) => gene.num_events,
    size: 50,
    minSize: 30,
    maxSize: 200,
    cell: alignRight,
  },
  {
    header: 'Diversity',
    accessorFn: (gene) => gene.divers,
    size: 60,
    minSize: 50,
    maxSize: 200,
  },
  {
    header: 'Length',
    accessorFn: (gene) => gene.length,
    size: 60,
    minSize: 50,
    maxSize: 200,
    cell: alignRight,
  },
]

const GENE_CLUSTERS_TABLE_COLUMN_ORDER = getColumnDefNames(GENE_CLUSTERS_TABLE_COLUMNS)

const GENE_CLUSTERS_TABLE_SEARCH_KEYS: Extract<keyof GeneCluster, string>[] = ['mnemonic', 'name']

export interface GeneClustersTableProps {
  species: SpeciesDesc
  clusters: GeneCluster[]
}

export function GeneClustersTable({ species, clusters }: GeneClustersTableProps) {
  const { t } = useTranslationSafe()
  const [selectedRowId, setSelectedRowId] = useRecoilState(currentGeneIdAtom(species.id))
  return (
    <Table
      title={t('Select gene')}
      searchTitle={t('Search genes')}
      data_={clusters}
      columns_={GENE_CLUSTERS_TABLE_COLUMNS}
      initialColumnOrder={GENE_CLUSTERS_TABLE_COLUMN_ORDER}
      searchKeys={GENE_CLUSTERS_TABLE_SEARCH_KEYS}
      selectedRowId={selectedRowId}
      setSelectedRowId={setSelectedRowId}
      getRowId={geneClusterGetId}
    />
  )
}
