import 'reflect-metadata'

import 'src/styles/global.scss'

import { isNil, memoize } from 'lodash'
import { useRouter } from 'next/router'
import React, { Suspense, useMemo } from 'react'
import type { AppProps } from 'next/app'
import type { NextComponentType, NextPageContext } from 'next'
import dynamic from 'next/dynamic'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { RecoilRoot } from 'recoil'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient, QueryClientConfig, QueryClientProvider } from '@tanstack/react-query'
import Route from 'route-parser'
import { SpeciesPage } from 'src/components/Species/SpeciesPage'
import { ThemeProvider } from 'styled-components'
import { Provider as ReactReduxProvider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { MDXProvider } from '@mdx-js/react'

import { DOMAIN_STRIPPED } from 'src/constants'
import { theme } from 'src/theme'
import { configureStore } from 'src/state/store'
import { useDataIndexQuery } from 'src/hooks/useDataIndexQuery'
import i18n from 'src/i18n/i18n'
import { OverlayAnchor } from 'src/components/Common/OverlayAnchor'
import { ErrorPopup } from 'src/components/Error/ErrorPopup'
import { LOADING } from 'src/components/Loading/Loading'
import { SEO } from 'src/components/Common/SEO'
import { Plausible } from 'src/components/Common/Plausible'
import { ErrorBoundary } from 'src/components/Error/ErrorBoundary'
import { PreviewWarning } from 'src/components/Common/PreviewWarning'
import { getMdxComponents } from 'src/components/Common/MdxComponents'
import NotFoundPage from 'src/pages/404'

if (process.env.NODE_ENV === 'development') {
  // Ignore recoil warning messages in browser console
  // https://github.com/facebookexperimental/Recoil/issues/733
  const shouldFilter = (args: (string | undefined)[]) =>
    args[0] && typeof args[0].includes === 'function' && args[0].includes('Duplicate atom key')

  const mutedConsole = memoize((console: Console) => ({
    ...console,
    warn: (...args: (string | undefined)[]) => (shouldFilter(args) ? null : console.warn(...args)),
    error: (...args: (string | undefined)[]) => (shouldFilter(args) ? null : console.error(...args)),
  }))
  global.console = mutedConsole(global.console)
}

const SPECIES_ROUTE = new Route<{ species: string }>('/species/:species')

export type Obj = Record<string, unknown>

export interface ClientSideRouterProps {
  Component: NextComponentType<NextPageContext>
  pageProps: Obj
}

export function ClientSideRouter({ Component, pageProps }: ClientSideRouterProps) {
  const router = useRouter()
  const { asPath } = router

  const indexJson = useDataIndexQuery({
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
    refetchInterval: 24 * 60 * 60 * 1000,
  })

  return useMemo(() => {
    const routeMatch = SPECIES_ROUTE.match(asPath)
    if (!isNil(routeMatch) && routeMatch?.species) {
      const datasets = [...indexJson.species, ...indexJson.case_studies, ...indexJson.orders]
      const species = datasets.find(({ id }) => id === routeMatch?.species)
      if (species) {
        return <SpeciesPage species={species} />
      }
      return <NotFoundPage />
    }
    return <Component {...pageProps} />
  }, [Component, asPath, indexJson, pageProps])
}

const REACT_QUERY_OPTIONS: QueryClientConfig = {
  defaultOptions: { queries: { suspense: true, retry: 1 } },
}

export interface MyAppProps extends AppProps<Obj> {
  pageProps: Obj
}

export function MyApp({ Component, pageProps }: MyAppProps) {
  const queryClient = useMemo(() => new QueryClient(REACT_QUERY_OPTIONS), [])
  const { store } = useMemo(() => configureStore(), [])

  return (
    <Suspense fallback={LOADING}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <ReactReduxProvider store={store}>
          <RecoilRoot>
            <DndProvider backend={HTML5Backend}>
              <ThemeProvider theme={theme}>
                <MDXProvider components={getMdxComponents}>
                  <Plausible domain={DOMAIN_STRIPPED} />
                  <I18nextProvider i18n={i18n}>
                    <ErrorBoundary>
                      <SEO />
                      <PreviewWarning />
                      <ClientSideRouter Component={Component} pageProps={pageProps} />
                      <OverlayAnchor />
                      <ErrorPopup />
                    </ErrorBoundary>
                  </I18nextProvider>
                </MDXProvider>
              </ThemeProvider>
            </DndProvider>
          </RecoilRoot>
        </ReactReduxProvider>
      </QueryClientProvider>
    </Suspense>
  )
}

// NOTE: This disables server-side rendering (SSR) entirely
export default dynamic(() => Promise.resolve(MyApp), { ssr: false })
