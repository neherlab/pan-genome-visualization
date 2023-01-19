/* eslint-disable no-loops/no-loops */
import { max, min, cloneDeep, sumBy, meanBy, isEmpty, last, isNil } from 'lodash'
import { ErrorInternal } from 'src/helpers/ErrorInternal'

import { PHYLO_GRAPH_NODE_RADIUS } from './constants'

export interface GraphRaw {
  nodes: GraphNodeRaw[]
  edges: GraphEdge[]
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphNodeRaw {
  id: string
  name: string
  branch_length?: number
  clade?: string
  attr?: {
    strain?: string
    collection_date?: string
    country?: string
    host?: string
    organism?: string
    [k: string]: unknown
  }
}

export interface GraphNode extends GraphNodeRaw {
  x: number
  y: number
  color?: string
  layout: {
    numLeaves: number
    meanDepth: number
    minDepth: number
    maxDepth: number
    meanRank: number
    minRank: number
    maxRank: number
    yTBarStart: number
    xTBarStart: number
    yTBarEnd: number
    xTBarEnd: number
  }
}

export function convertNode(nodeRaw: GraphNodeRaw): GraphNode {
  return {
    ...nodeRaw,
    x: 0,
    y: 0,
    layout: {
      numLeaves: 0,
      meanDepth: 0,
      minDepth: 0,
      maxDepth: 0,
      meanRank: 0,
      minRank: 0,
      maxRank: 0,
      yTBarStart: 0,
      xTBarStart: 0,
      yTBarEnd: 0,
      xTBarEnd: 0,
    },
  }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface GraphLayoutOptions {
  mirrored?: boolean
  scaleBranches?: boolean
}

export function calculateGraphLayout(
  graphRaw: GraphRaw,
  width: number,
  height: number,
  options?: GraphLayoutOptions,
): Graph {
  const graph: Graph = { ...cloneDeep(graphRaw), nodes: graphRaw.nodes.map(convertNode) }

  let rank = 0
  let depth = 0
  traverseDepthFirstPostOrder(graph, ({ node }) => {
    const children = getChildren(graph, node.id)
    const isLeaf = isEmpty(children)
    if (isLeaf) {
      node.layout.numLeaves = 1
      rank += 1
      node.layout.meanRank = rank
      node.layout.minRank = rank
      node.layout.maxRank = rank
    } else {
      node.layout.numLeaves = sumBy(children, ([child, _]) => child.layout.numLeaves)
      node.layout.meanRank = meanBy(children, ([child, _]) => child.layout.meanRank)
      node.layout.minRank = min(children.map(([child, _]) => child.layout.meanRank)) ?? 0
      node.layout.maxRank = max(children.map(([child, _]) => child.layout.meanRank)) ?? 0
    }
    return node
  })

  traverseDepthFirstPreOrder(graph, ({ node }) => {
    const parents = getParents(graph, node.id)
    const isRoot = isEmpty(parents)
    if (isRoot) {
      node.layout.meanDepth = 0
      node.layout.maxDepth = 0
      node.layout.minDepth = 0
    } else {
      const depth = options?.scaleBranches && !isNil(node.branch_length) ? node.branch_length : 1
      node.layout.meanDepth = meanBy(parents, ([parent]) => parent.layout.meanDepth) + depth
      node.layout.minDepth = (min(parents.map(([parent, _]) => parent.layout.meanDepth)) ?? 0) + depth
      node.layout.maxDepth = (max(parents.map(([parent, _]) => parent.layout.meanDepth)) ?? 0) + depth
    }
    depth = Math.max(depth, node.layout.maxDepth)
    return node
  })

  const xSpacing = (width - PHYLO_GRAPH_NODE_RADIUS * 2) / depth
  const ySpacing = (height - PHYLO_GRAPH_NODE_RADIUS * 2) / rank

  graph.nodes.forEach((node) => {
    const x = node.layout.meanDepth * xSpacing + PHYLO_GRAPH_NODE_RADIUS
    node.x = options?.mirrored ? width - x : x
    node.y = node.layout.meanRank * ySpacing + PHYLO_GRAPH_NODE_RADIUS
    if (!isLeafNode(graph, node.id)) {
      const xTBarStart = node.layout.meanDepth * xSpacing + PHYLO_GRAPH_NODE_RADIUS
      const xTBarEnd = node.layout.meanDepth * xSpacing + PHYLO_GRAPH_NODE_RADIUS

      node.layout.xTBarStart = options?.mirrored ? width - xTBarStart : xTBarStart
      node.layout.xTBarEnd = options?.mirrored ? width - xTBarEnd : xTBarEnd

      node.layout.yTBarStart = node.layout.minRank * ySpacing + PHYLO_GRAPH_NODE_RADIUS
      node.layout.yTBarEnd = node.layout.maxRank * ySpacing + PHYLO_GRAPH_NODE_RADIUS
    }
  })

  return graph
}

export interface ExplorerParams {
  node: GraphNode
}

// Explore graph in breadth-first fashion given an explorer function.
export function traverseBreadthFirst<T>(
  graph: Graph,
  explorer: (params: ExplorerParams) => T,
  options?: { backward?: boolean },
): T[] {
  // First frontier is all the roots or all the leaves depending on direction of traversal
  const frontier = options?.backward ? getLeaves(graph) : getRoots(graph)

  // Fill queue with the first frontier
  const queue: { node: GraphNode; depth: number }[] = frontier.map((node) => ({ node, depth: 0 }))

  // Mark first frontier as explored
  const explored = new Set<string>(frontier.map((node) => node.id))

  const results: T[] = []

  while (queue.length > 0) {
    const item = queue.shift()
    if (!item) {
      return results
    }

    const { node, depth } = item

    // Perform the exploration as defined by the caller function
    const result = explorer({ node })
    explored.add(node.id)
    results.push(result)

    // Next, proceed with either children or parents, depending on which direction we are traversing
    const successors = options?.backward ? getParents(graph, node.id) : getChildren(graph, node.id)

    // Enqueue children (unless already explored)
    successors.forEach(([child, _]) => {
      if (!explored.has(child.id)) {
        queue.push({ node: child, depth: depth + 1 })
      }
    })
  }

  return results
}

// Explore graph in breadth-first fashion, backwards
export function traverseBreadthFirstBackwards<T>(
  graph: Graph,
  explorer: (params: ExplorerParams) => T,
  options?: { backward?: boolean },
): T[] {
  return traverseBreadthFirst(graph, explorer, { ...options, backward: true })
}

// Explore graph in depth-first pre-order fashion
export function traverseDepthFirstPreOrder<T>(graph: Graph, explorer: (params: ExplorerParams) => T) {
  const roots = getRoots(graph)
  if (isEmpty(roots)) {
    return []
  }

  const stack: GraphNode[] = roots
  const explored = new Set<string>()
  const results = []

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const node = stack.pop()
    if (!node) {
      return results
    }

    results.push(explorer({ node }))
    explored.add(node.id)

    getChildren(graph, node.id)
      .reverse()
      .forEach(([child]) => {
        if (!explored.has(child.id)) {
          stack.push(child)
          explored.add(child.id)
        }
      })
  }
}

// Explore graph in depth-first post-order fashion
export function traverseDepthFirstPostOrder<T>(graph: Graph, explorer: (params: ExplorerParams) => T) {
  const roots = getRoots(graph)

  if (isEmpty(roots)) {
    return []
  }

  // TODO: Implement post-order traversal with multiple roots
  if (roots.length > 1) {
    throw new ErrorInternal('Not implemented: multiple tree roots are not yet implmented')
  }
  const root = roots[0]

  const stack: GraphNode[] = []
  const explored = new Set<string>()
  const results = []
  stack.push(root)

  let node
  while ((node = last(stack))) {
    let isTail = true
    for (const [child, _] of getChildren(graph, node.id)) {
      if (!explored.has(child.id)) {
        isTail = false
        stack.push(child)
        explored.add(child.id)
        break
      }
    }

    if (isTail) {
      stack.pop()
      results.push(explorer({ node }))
      explored.add(node.id)
    }
  }
  return results
}

export function getNodesForEdge(graph: Graph, edge: GraphEdge) {
  const source = getNodeById(graph, edge.source)
  const target = getNodeById(graph, edge.target)
  return { source, target }
}

export function getNodeById(graph: Graph, id: string): GraphNode {
  const node = graph.nodes.find((node) => node.id === id)
  if (!node) {
    throw new Error(`Node '${id}' not found`)
  }
  return node
}

export function getParents(graph: Graph, nodeId: string): [GraphNode, GraphEdge][] {
  // Parent nodes are source nodes of edges where this node is the target
  return graph.edges
    .filter((edge) => nodeId === edge.target)
    .flatMap((edge) => {
      const parents = graph.nodes.filter((node) => node.id === edge.source)
      const pairs: [GraphNode, GraphEdge][] = parents.map((parent) => [parent, edge])
      return pairs
    })
}

export function getChildren(graph: Graph, nodeId: string): [GraphNode, GraphEdge][] {
  // Child nodes are target nodes of edges where this node is the source
  return graph.edges
    .filter((edge) => nodeId === edge.source)
    .flatMap((edge) => {
      const children = graph.nodes.filter((node) => node.id === edge.target)
      const pairs: [GraphNode, GraphEdge][] = children.map((node) => [node, edge])
      return pairs
    })
}

export function getSiblings(graph: Graph, nodeId: string): GraphNode[] {
  // Sibling nodes are all the child nodes of all parents
  return getParents(graph, nodeId).flatMap(([parent, _]) => getChildren(graph, parent.id).map(([child, _]) => child))
}

export function getRoots(graph: Graph) {
  // Roots are the nodes that have no parents, i.e. each node which is never a target of an edge
  const targetNodeIds = new Set(graph.edges.map((edge) => edge.target))
  return graph.nodes.filter((node) => !targetNodeIds.has(node.id))
}

export function getLeaves(graph: Graph) {
  // Leaves are the nodes that have no children, i.e. each node which is never a source of an edge
  const sourceNodeIds = new Set(graph.edges.map((edge) => edge.source))
  return graph.nodes.filter((node) => !sourceNodeIds.has(node.id))
}

export function isLeafNode(graph: Graph, nodeId: string) {
  return getLeaves(graph).some((leaf) => leaf.id === nodeId)
}

export function isRootNode(graph: Graph, nodeId: string) {
  return getRoots(graph).some((root) => root.id === nodeId)
}
