import { get } from 'lodash'

export const NUCLEOTIDE_COLORS: Record<string, string> = {
  'A': '#b54330',
  'C': '#3c5bd6',
  'G': '#9c8d1c',
  'T': '#409543',
  'N': '#555555',
  '-': '#777777',
} as const

export function getNucleotideColor(nuc: string) {
  return get(NUCLEOTIDE_COLORS, nuc) ?? 'transparent'
}
