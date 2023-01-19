import { zip } from 'lodash'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export interface FastaEntry {
  index: number
  accession: string
  info?: string
  seq: string
}

/** Parses FASTA string into an array of fasta entries */
export function parseFasta(fasta: string): FastaEntry[] {
  return fasta
    .trim()
    .split('>')
    .map((entry, index) => {
      const lines = entry
        .trim()
        .split('\n')
        .map((line) => line.trim())

      const headers = lines?.[0].replace(/^>/, '').split('|') ?? []
      const accession = headers?.[0] ?? index.toString()
      const info = headers?.[1]

      const seq = lines.splice(1).join('').toUpperCase()

      return { index, accession, info, seq }
    })
}

export interface Mutation {
  ref: string
  pos: number
  qry: string
}

export interface SequenceEntry extends FastaEntry {
  mutations: Mutation[]
}

export interface ReferenceAndMutations {
  refEntry: FastaEntry
  entries: SequenceEntry[]
}

/** Parses FASTA string into reference sequence and an array of mutations per query sequence */
// TODO: this should be done offline, when preparing the data
export function parseFastaToRefAndMutations(fasta: string): ReferenceAndMutations {
  const fastaEntries = parseFasta(fasta)

  if (fastaEntries.length === 0) {
    throw new Error('When detecting query mutations: Unable to find consensus sequence: No sequences found in input')
  }

  const refEntry = fastaEntries.find((entry) => entry.accession.toLowerCase() === 'consensus') ?? fastaEntries[0]

  const qryEntries = fastaEntries.filter((entry) => entry.index !== refEntry.index)

  const entries = qryEntries.map((qryEntry) => {
    if (qryEntry.seq.length === 0) {
      return { ...qryEntry, mutations: [] }
    }

    const mutations = zip(refEntry.seq.split(''), qryEntry.seq.split(''))
      .map(([ref, qry], pos) => {
        if (!ref) {
          throw new Error('When detecting query mutations: Reference sequence is shorter than query')
        }

        if (!qry || qry === '.') {
          return undefined
        }

        return { ref, pos, qry }
      })
      .filter(notUndefinedOrNull)

    return { ...qryEntry, mutations }
  })

  return { refEntry, entries }
}
