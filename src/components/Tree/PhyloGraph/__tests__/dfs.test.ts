import { expect, test } from '@jest/globals'
import copy from 'fast-copy'
import { Graph, traverseDepthFirstPostOrder, traverseDepthFirstPreOrder } from 'src/components/Tree/PhyloGraph/graph'

test('traverses depth first pre-order', async () => {
  const result: string[] = []
  traverseDepthFirstPreOrder(copy(graph), ({ node }) => result.push(node.id))
  const expected = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17']
  expect(result).toStrictEqual(expected)
})

test('traverses depth first post-order', async () => {
  const result: string[] = []
  traverseDepthFirstPostOrder(copy(graph), ({ node }) => result.push(node.id))
  const expected = ['2', '3', '1', '5', '8', '9', '10', '11', '7', '13', '14', '15', '16', '17', '12', '6', '4', '0']
  expect(result).toStrictEqual(expected)
})

const graph = {
  nodes: [
    { id: '0' },
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: '6' },
    { id: '7' },
    { id: '8' },
    { id: '9' },
    { id: '10' },
    { id: '11' },
    { id: '12' },
    { id: '13' },
    { id: '14' },
    { id: '15' },
    { id: '16' },
    { id: '17' },
  ],
  edges: [
    { id: '0', source: '0', target: '1' },
    { id: '1', source: '1', target: '2' },
    { id: '2', source: '1', target: '3' },
    { id: '3', source: '0', target: '4' },
    { id: '4', source: '4', target: '5' },
    { id: '5', source: '4', target: '6' },
    { id: '6', source: '6', target: '7' },
    { id: '7', source: '7', target: '8' },
    { id: '8', source: '7', target: '9' },
    { id: '9', source: '7', target: '10' },
    { id: '10', source: '7', target: '11' },
    { id: '11', source: '6', target: '12' },
    { id: '12', source: '12', target: '13' },
    { id: '13', source: '12', target: '14' },
    { id: '14', source: '12', target: '15' },
    { id: '15', source: '12', target: '16' },
    { id: '16', source: '12', target: '17' },
  ],
} as Graph
