import { useCallback, useState } from 'react'

/** Convenience hook giving a boolean state and enable/disable functions */
export function useEnable(initialState: boolean): [boolean, () => void, () => void] {
  const [enabled, setEnabled] = useState(initialState)
  const enable = useCallback(() => setEnabled(true), [])
  const disable = useCallback(() => setEnabled(false), [])
  return [enabled, enable, disable]
}
