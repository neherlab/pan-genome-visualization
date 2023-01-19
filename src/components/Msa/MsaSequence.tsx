import React, { ComponentProps, ForwardedRef, forwardRef, useMemo } from 'react'
import Konva from 'konva'
import { Group } from 'react-konva'
import { useRecoilValue } from 'recoil'
import { MSA_CHAR_WIDTH, MsaCharacter } from 'src/components/Msa/MsaCharacter'
import { msaShowAaAtom } from 'src/state/msa.state'

export interface MsaSequenceProps extends ComponentProps<typeof Group> {
  seq: string
}

export const MsaSequence = forwardRef(function MsaSequenceWithRef(
  { seq, ...restProps }: MsaSequenceProps,
  ref: ForwardedRef<Konva.Group>,
) {
  const seqType = useRecoilValue(msaShowAaAtom)

  const chars = useMemo(
    () =>
      seq.split('').map((c, pos) => (
        // eslint-disable-next-line react/no-array-index-key
        <MsaCharacter key={`${c}-${pos}`} x={MSA_CHAR_WIDTH * pos} character={c} showAa={seqType} />
      )),
    [seq, seqType],
  )
  return (
    <Group ref={ref} {...restProps}>
      {chars}
    </Group>
  )
})
