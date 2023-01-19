import React, { ComponentProps, useMemo } from 'react'
import { Group } from 'react-konva'
import { useRecoilValue } from 'recoil'
import { MsaSequence } from 'src/components/Msa/MsaSequence'
import { FastaEntry, Mutation, SequenceEntry } from 'src/io/parseFasta'
import { msaOnlyMutationsAtom } from 'src/state/msa.state'

export interface MsaRowProps extends ComponentProps<typeof Group> {
  refEntry: FastaEntry
  entry: SequenceEntry
}

export function MsaRow({ refEntry, entry, ...restProps }: MsaRowProps) {
  const onlyMutations = useRecoilValue(msaOnlyMutationsAtom)

  const component = useMemo(() => {
    const seq = onlyMutations ? ' '.repeat(refEntry.seq.length) : refEntry.seq
    const mutations = entry.mutations.filter((mut) => mut.pos < refEntry.seq.length)
    return <MsaSequence seq={applyMutations(seq, mutations)} />
  }, [entry.mutations, onlyMutations, refEntry.seq])
  return <Group {...restProps}>{component}</Group>
}

function applyMutations(refSeq: string, mutations: Mutation[]) {
  const seq = refSeq.split('')
  mutations
    .filter((mut) => mut.pos < refSeq.length)
    .forEach(({ pos, qry }) => {
      seq[pos] = qry
    })
  return seq.join('')
}
