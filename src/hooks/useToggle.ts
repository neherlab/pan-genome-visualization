import { useCallback, useState } from 'react'

export function useToggle(initialState = false) {
  const [state, setState] = useState(initialState)
  const toggle = useCallback(() => setState((state) => !state), [])
  const enable = useCallback(() => setState(true), [])
  const disable = useCallback(() => setState(false), [])
  return { state, toggle, enable, disable }
}
