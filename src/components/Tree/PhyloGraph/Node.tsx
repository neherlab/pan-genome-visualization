import React, { memo, ReactElement, useCallback, useMemo } from 'react'
import { Text } from 'react-konva'
import { animated, useSpring } from '@react-spring/konva'
import { useRecoilState } from 'recoil'
import { useEnable } from 'src/hooks/useEnable'
import { PHYLO_GRAPH_NODE_LABEL_FONT_SIZE, PHYLO_GRAPH_NODE_RADIUS } from 'src/components/Tree/PhyloGraph/constants'
import { CanvasTooltip, CanvasTooltipPre } from 'src/components/Tree/PhyloGraph/CanvasTooltip'
import { isLeafNode, getLeaves, Graph, GraphNode } from 'src/components/Tree/PhyloGraph/graph'
import { highlightedNodeAtom } from 'src/state/tree.state'

export interface CladeTreeNodeProps {
  node: GraphNode
  graph: Graph
}

export const Node = memo(NodeUnmemo)

function NodeUnmemo({ node, graph }: CladeTreeNodeProps): ReactElement {
  const { x, y, id, color = '#222', name } = node
  const animatedProps = useSpring({ x, y, fill: color })
  const [isTooltipOpen, openTooltip, closeTooltip] = useEnable(false)
  const [isHighlighted, setIsHighlighted] = useRecoilState(highlightedNodeAtom(name))

  const onHover = useCallback(() => {
    openTooltip()
    setIsHighlighted(true)
  }, [openTooltip, setIsHighlighted])

  const onLeave = useCallback(() => {
    closeTooltip()
    setIsHighlighted(false)
  }, [closeTooltip, setIsHighlighted])

  const text = useMemo(() => {
    if (!isLeafNode(graph, id) || getLeaves(graph).length > 50) {
      return null
    }
    return (
      <Text
        x={PHYLO_GRAPH_NODE_RADIUS * 2}
        y={PHYLO_GRAPH_NODE_LABEL_FONT_SIZE / 2 - 2}
        width={PHYLO_GRAPH_NODE_RADIUS * 2}
        height={PHYLO_GRAPH_NODE_RADIUS * 2}
        fill="#222"
        fontSize={PHYLO_GRAPH_NODE_LABEL_FONT_SIZE}
        textAnchor="left"
        text={id}
      />
    )
  }, [graph, id])

  const circle = useMemo(() => {
    const stroke = isHighlighted ? 'lime' : undefined
    return (
      <>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore*/}
        <animated.Circle
          radius={PHYLO_GRAPH_NODE_RADIUS}
          fill={animatedProps.fill}
          stroke={stroke}
          strokeWidth={3}
          fillAfterStrokeEnabled
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          shadowForStrokeEnabled
          shadowColor="lime"
          shadowBlur={20}
          shadowEnabled={isHighlighted}
        />
        <CanvasTooltip isOpen={isTooltipOpen}>
          <CanvasTooltipPre>{JSON.stringify(node, null, 2)}</CanvasTooltipPre>
        </CanvasTooltip>
      </>
    )
  }, [animatedProps.fill, isHighlighted, isTooltipOpen, node, onHover, onLeave])

  const elements = useMemo(
    () => (
      <animated.Group {...animatedProps}>
        {circle}
        {text}
      </animated.Group>
    ),
    [circle, animatedProps, text],
  )

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{elements}</>
}
