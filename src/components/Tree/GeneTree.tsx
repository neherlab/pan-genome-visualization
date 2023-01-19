import React, { memo, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { useResizeDetector } from 'react-resize-detector'
import { useGeneClusterData } from 'src/hooks/useDataIndexQuery'
import type { GeneCluster, SpeciesDesc } from 'src/hooks/useDataIndexQuery'
import { convertPhyloTreeToGraph } from 'src/components/Tree/PhyloGraph/convertPhyloTreeToGraph'
import { PhyloGraph } from 'src/components/Tree/PhyloGraph/PhyloGraph'
import { geneTreeOptionsAtom } from 'src/state/tree.state'

export interface GeneTreeProps {
  species: SpeciesDesc
  gene: GeneCluster
}

function GeneTreeUnmemo({ species, gene }: GeneTreeProps) {
  const geneTreeOptions = useRecoilValue(geneTreeOptionsAtom)
  const { tree, meta } = useGeneClusterData(species, gene)
  const graph = useMemo(() => {
    if (!tree || !meta) {
      return null
    }
    return convertPhyloTreeToGraph(tree, meta)
  }, [meta, tree])

  const {
    width,
    height,
    ref: containerRef,
  } = useResizeDetector({
    handleHeight: true,
    refreshOptions: { leading: true, trailing: true },
  })

  if (!graph) {
    return null
  }

  return (
    <div className="w-100 h-100" ref={containerRef}>
      <PhyloGraph width={width} height={height} graph={graph} options={geneTreeOptions} />
    </div>
  )
}

export const GeneTree = memo(GeneTreeUnmemo)
