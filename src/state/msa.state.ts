import { atom } from 'recoil'

export const msaOnlyMutationsAtom = atom({
  key: 'onlyMutationsAtom',
  default: true,
})

export const msaShowAaAtom = atom({
  key: 'msaShowAaAtom',
  default: true,
})
