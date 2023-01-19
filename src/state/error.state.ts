import { atom } from 'recoil'

export const globalErrorAtom = atom<Error | undefined>({
  key: 'globalError',
  default: undefined,
  effects: [
    ({ onSet }) => {
      onSet((error, _1, isReset) => {
        if (error && !isReset) {
          console.error(error)
        }
      })
    },
  ],
})
