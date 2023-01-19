import { isNil } from 'lodash'
import React, { PropsWithChildren } from 'react'
import styled from 'styled-components'
import useMouseState from 'beautiful-react-hooks/useMouseState'
import { KonvaHtmlPortal } from 'src/components/Tree/PhyloGraph/KonvaHtml'

export interface CanvasTooltipProps {
  isOpen: boolean
}

/** Allows rendering DOM elements in a popover inside react-konva's tree */
export function CanvasTooltip({ isOpen, children }: PropsWithChildren<CanvasTooltipProps>) {
  if (!isOpen) {
    return null
  }

  return (
    <KonvaHtmlPortal target="overlay-anchor">
      <CanvasTooltipFollowingMouse>{children}</CanvasTooltipFollowingMouse>
    </KonvaHtmlPortal>
  )
}

function CanvasTooltipFollowingMouse({ children }: PropsWithChildren<unknown>) {
  const { clientX: x, clientY: y } = useMouseState()

  if (isNil(x) || isNil(y) || x === 0 || y === 0) {
    return null
  }

  return (
    <CanvasTooltipWrapper $x={x} $y={y}>
      {children}
    </CanvasTooltipWrapper>
  )
}

const CanvasTooltipWrapper = styled.div.attrs(({ $x, $y }: { $x: number; $y: number }) => ({
  style: {
    left: `${$x}px`,
    top: `${$y}px`,
  },
}))<{ $x: number; $y: number }>`
  opacity: 0.8;
  position: absolute;
  padding: 0.5rem;
  background-color: ${(props) => props.theme.bodyBg};
  border-radius: 3px;
  box-shadow: 3px 3px 15px 8px #0002;
  pointer-events: none;
  overflow: hidden;
`

export const CanvasTooltipPre = styled.pre`
  margin: 0;
  font-size: 0.75rem;
  max-width: 300px;
  text-overflow: ellipsis;
  overflow: hidden;
`
