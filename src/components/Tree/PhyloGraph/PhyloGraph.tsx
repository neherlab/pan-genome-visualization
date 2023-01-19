import React, { memo, useMemo } from 'react'
import { Stage, Layer } from 'react-konva'
import { verifyGraph } from 'src/components/Tree/PhyloGraph/verifyGraph'
import { calculateGraphLayout, GraphLayoutOptions, GraphRaw } from './graph'
import { Node } from './Node'
import { Edge } from './Edge'

export interface PhyloGraphProps {
  width?: number
  height?: number
  graph: GraphRaw
  options?: GraphLayoutOptions
}

export const PhyloGraph = memo(PhyloGraphUnmemo)

function PhyloGraphUnmemo({ width, height, graph: graphRaw, options }: PhyloGraphProps) {
  const { nodeComponents, edgeComponents } = useMemo(() => {
    if (!width || !height) {
      return { nodeComponents: [], edgeComponents: [] }
    }
    verifyGraph(graphRaw)
    const graph = calculateGraphLayout(graphRaw, width, height, options)
    const nodeComponents = graph.nodes.map((node) => <Node key={node.id} graph={graph} node={node} />)
    const edgeComponents = graph.edges.map((edge) => <Edge key={edge.id} graph={graph} edge={edge} />)
    return { nodeComponents, edgeComponents }
  }, [graphRaw, height, options, width])

  return (
    <Stage width={width} height={height}>
      <Layer clearBeforeDraw>
        {edgeComponents}
        {nodeComponents}
      </Layer>
    </Stage>
  )
}
