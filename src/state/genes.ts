import { atomFamily } from 'recoil'

export const currentGeneIdAtom = atomFamily<number, string>({
  key: 'currentGeneId',
  default: (_) => 1,
})
