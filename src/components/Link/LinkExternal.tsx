import React, { HTMLProps, PropsWithChildren } from 'react'
import styled from 'styled-components'
import { StrictOmit } from 'ts-essentials'

const A = styled.a`
  overflow-wrap: break-word;
  word-wrap: break-word;
`

export interface LinkExternalProps extends StrictOmit<HTMLProps<HTMLAnchorElement>, 'as' | 'ref' | 'download'> {
  download?: boolean
}

export function LinkExternal({ children, download, ...restProps }: PropsWithChildren<LinkExternalProps>) {
  return (
    <A target="_blank" rel="noopener noreferrer" download={download} {...restProps}>
      {children}
    </A>
  )
}
