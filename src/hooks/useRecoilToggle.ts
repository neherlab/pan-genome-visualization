import { useCallback } from 'react'
import { RecoilState, useRecoilState } from 'recoil'

export function useRecoilToggle(recoilState: RecoilState<boolean>) {
  const [state, setState] = useRecoilState(recoilState)
  const toggle = useCallback(() => setState((state) => !state), [setState])
  const enable = useCallback(() => setState(true), [setState])
  const disable = useCallback(() => setState(false), [setState])
  return { state, toggle, enable, disable }
}
