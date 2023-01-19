import React, { PropsWithChildren, useMemo } from 'react'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { getDataRootUrl, SpeciesDesc } from 'src/hooks/useDataIndexQuery'
import urljoin from 'url-join'

export interface SpeciesTableCellDownloadListProps {
  species: SpeciesDesc
}

export function SpeciesTableCellDownloadList({ species }: SpeciesTableCellDownloadListProps) {
  const { t } = useTranslationSafe()

  const links = useMemo(() => {
    const links = [
      { key: 'G', text: t('Gene cluster JSON'), filename: 'gene_cluster.json' },
      { key: 'M', text: t('Metadata table'), filename: 'metainfo.tsv' },
      { key: 'T', text: t('Strain/species tree'), filename: 'strain_tree.nwk' },
      { key: 'J', text: t('Strain/species tree'), filename: 'strain_tree.json' },
      { key: 'A', text: t('All gene alignments'), filename: 'all_gene_alignments.zip' },
      { key: 'C', text: t('Core gene alignments'), filename: 'core_gene_alignments.zip' },
    ]

    return links.map(({ key, text, filename }) => (
      <SpeciesTableDownloadLink key={key} speciesId={species.id} filename={filename} title={text}>
        {key}
      </SpeciesTableDownloadLink>
    ))
  }, [species.id, t])

  return <span>{links}</span>
}

export interface SpeciesTableDownloadLinkProps {
  title: string
  filename: string
  speciesId: string
}

export function SpeciesTableDownloadLink({
  speciesId,
  filename,
  children,
  title,
}: PropsWithChildren<SpeciesTableDownloadLinkProps>) {
  const fullUrl = useMemo(() => urljoin(getDataRootUrl(), 'dataset', speciesId, filename), [filename, speciesId])

  return (
    <span className="mx-1" title={title}>
      <LinkExternal download href={fullUrl}>
        {children}
      </LinkExternal>
    </span>
  )
}
