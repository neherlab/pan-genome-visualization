import type { GraphRaw } from './graph'

/** Verify that graph structure is sound */
export function verifyGraph({ nodes, edges }: GraphRaw) {
  edges.forEach((edge) => {
    if (edge.target === edge.source) {
      throw new Error(`Graph is invalid: invalid edge: the target node '${edge.target}' is the same as source node`)
    }

    if (!nodes.some((node) => edge.target === node.id)) {
      throw new Error(`Graph is invalid: invalid edge: the target node '${edge.target}' does not exist`)
    }

    if (!nodes.some((node) => edge.source === node.id)) {
      throw new Error(`Graph is invalid: invalid edge: the source node '${edge.source}' does not exist`)
    }
  })
}
