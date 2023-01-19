import React, { HTMLProps } from 'react'
import styled from 'styled-components'

/** Fullscreen overlay element with overflow hidden. Convenient place to attach popovers, modals etc. */
export function OverlayAnchor({ id = 'overlay-anchor', ...restProps }: HTMLProps<HTMLDivElement>) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return <OverlayAnchorStyled id={id} {...restProps} />
}

export const OverlayAnchorStyled = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
`
