import type { QueriesOptions, QueryKey, UseQueryOptions } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { concurrent } from 'fasy'
import { keys, values, zip } from 'lodash'
import { useMemo } from 'react'

import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { axiosFetch } from 'src/io/axiosFetch'
import { parseCsv } from 'src/io/parseCsv'
import { useQueries } from './useQueriesWithSuspense'

const QUERY_OPTIONS_DEFAULT = {
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchInterval: Number.POSITIVE_INFINITY,
}

function queryOptionsDefaulted<T>(options: T) {
  let newOptions = QUERY_OPTIONS_DEFAULT
  if (options) {
    newOptions = { ...newOptions, ...options }
  }
  return newOptions
}

export type QueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'initialData'> & {
  initialData?: () => undefined
}

export type UseAxiosQueryOptions<TData = unknown> = QueryOptions<TData, Error, TData, string[]>
export type UseAxiosQueriesOptions<TData = unknown> = QueriesOptions<TData[]>

/** Makes a cached fetch request */
export function useAxiosQuery<TData = unknown>(url: string, options?: UseAxiosQueryOptions<TData>): TData {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])
  const res = useQuery<TData, Error, TData, string[]>([url], async () => axiosFetch(url), newOptions)
  return useMemo(() => {
    if (!res.data) {
      throw new Error(`Fetch failed: ${url}`)
    }
    return res.data
  }, [res.data, url])
}

/** Make multiple cached fetches in parallel (and uses `Suspense`, by contrast to the default `useQueries()`)  */
export function useAxiosQueries<TData = unknown>(
  namedUrls: Record<string, string>,
  options?: UseAxiosQueriesOptions<TData>,
): TData {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])

  const results = useQueries({
    queries: values(namedUrls).map((url) => ({
      ...newOptions,
      suspense: true,
      useErrorBoundary: true,
      queryKey: [url],
      queryFn: async () => axiosFetch(url),
    })),
    options: {
      suspense: true,
    },
  })

  return useMemo(() => {
    return Object.fromEntries(
      zip(keys(namedUrls), values(namedUrls), results).map(([key, url, result]) => {
        if (!key || !url || !result) {
          throw new ErrorInternal('useAxiosQueries: Attempted to zip arrays of different sizes.')
        }

        if (!result.data) {
          throw new Error(`Fetch failed: ${key}: ${url}`)
        }
        return [key, result.data]
      }),
    )
  }, [namedUrls, results]) as unknown as TData
}

/** Makes a cached fetch request and extracts .tar file */
export function useAxiosTarQuery(
  url: string,
  options?: UseAxiosQueryOptions<Record<string, string>>,
): Record<string, string> {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])
  const res = useQuery<Record<string, string>, Error, Record<string, string>, string[]>(
    [url],
    async () => {
      const res = await axiosFetch<ArrayBuffer>(url, { responseType: 'arraybuffer' })
      return import('js-untar')
        .then(({ default: untar }) => {
          return untar(res)
        })
        .then(
          async function filfill(extractedFiles) {
            return Object.fromEntries(await concurrent.map(async (f) => [f.name, await f.blob.text()], extractedFiles))
          },
          function reject(error_: unknown) {
            const error = sanitizeError(error_)
            error.message = `When extracting tar archive '${url}': ${error.message}`
            throw error
          },
        )
    },
    newOptions,
  )

  return useMemo(() => {
    if (!res.data) {
      throw new Error(`Fetch failed: ${url}`)
    }
    return res.data
  }, [res.data, url])
}

/** Makes a cached fetch request and parses a CSV file */
export function useAxiosCsvQuery<T>(url: string, delimiter: string, options?: UseAxiosQueryOptions<T[]>): T[] {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])

  const res = useQuery(
    [url],
    async () => {
      const res = await axiosFetch<string>(url, { responseType: 'text' })
      return parseCsv<T>(res, delimiter)
    },
    newOptions,
  )

  return useMemo(() => {
    if (!res.data) {
      throw new Error(`Fetch failed: ${url}`)
    }
    return res.data
  }, [res.data, url])
}
