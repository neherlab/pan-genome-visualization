import React from 'react'
import { Button } from 'reactstrap'
import styled, { StyledHtmlProps } from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useRecoilToggle } from 'src/hooks/useRecoilToggle'
import { msaOnlyMutationsAtom, msaShowAaAtom } from 'src/state/msa.state'

export function MsaToolbar(props: StyledHtmlProps<HTMLDivElement>) {
  const { t } = useTranslationSafe()
  const { state: showAa, toggle: toggleShowAa } = useRecoilToggle(msaShowAaAtom)
  const { state: onlyMutations, toggle: toggleOnlyMutations } = useRecoilToggle(msaOnlyMutationsAtom)

  return (
    <MsaToolbarWrapper {...props}>
      <Button active={showAa} onClick={toggleShowAa}>
        {t('AA')}
      </Button>
      <Button active={!onlyMutations} onClick={toggleOnlyMutations}>
        {t('Full')}
      </Button>
    </MsaToolbarWrapper>
  )
}

const MsaToolbarWrapper = styled.div`
  & > * {
    margin: 0 0.1rem;
  }
`
