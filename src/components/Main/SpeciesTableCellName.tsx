import React, { useMemo } from 'react'
import urljoin from 'url-join'

import { SpeciesDesc } from 'src/hooks/useDataIndexQuery'
import { Link } from 'src/components/Link/Link'

export interface SpeciesTableCellNameProps {
  species: SpeciesDesc
}

export function SpeciesTableCellName({ species }: SpeciesTableCellNameProps) {
  const href = useMemo(() => urljoin('/species', species.id), [species.id])
  return <Link href={href}>{species.name}</Link>
}
