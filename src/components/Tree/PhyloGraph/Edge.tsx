import React, { memo, useMemo } from 'react'
import { animated, useSpring } from '@react-spring/konva'
import { useEnable } from 'src/hooks/useEnable'
import { CanvasTooltip, CanvasTooltipPre } from './CanvasTooltip'
import { getNodesForEdge, Graph, GraphEdge } from './graph'

export interface EdgeProps {
  edge: GraphEdge
  graph: Graph
}

export const Edge = memo(EdgeUnmemo)

export function EdgeUnmemo({ edge, graph }: EdgeProps) {
  const [isTooltipOpen, openTooltip, closeTooltip] = useEnable(false)

  const points = useMemo(() => {
    const { source, target } = getNodesForEdge(graph, edge)

    // prettier-ignore
    return [
      // Vertical line
      source.layout.xTBarStart, source.layout.yTBarStart,
      source.layout.xTBarEnd, source.layout.yTBarEnd,

      // Horizontal line
      source.layout.xTBarStart, target.y,
      target.x, target.y
    ]
  }, [edge, graph])

  const lineAnimatedProps = useSpring({ points })

  const line = useMemo(() => {
    return (
      <>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <animated.Line
          {...lineAnimatedProps}
          stroke="#aaa"
          strokeWidth={5}
          onMouseEnter={openTooltip}
          onMouseOut={closeTooltip}
        />
        <CanvasTooltip isOpen={isTooltipOpen}>
          <CanvasTooltipPre>{JSON.stringify(edge, null, 2)}</CanvasTooltipPre>
        </CanvasTooltip>
      </>
    )
  }, [closeTooltip, edge, isTooltipOpen, lineAnimatedProps, openTooltip])

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{line}</>
}
