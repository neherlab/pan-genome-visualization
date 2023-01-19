import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export function useTranslationSafe() {
  const response = useTranslation()

  const t = useCallback(
    (key: string, options?: Record<string, unknown>) => {
      return response.t(key, options) ?? key
    },
    [response],
  )

  return { t }
}
