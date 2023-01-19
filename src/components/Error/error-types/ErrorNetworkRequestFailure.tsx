import React from 'react'

import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { ErrorContainer } from 'src/components/Error/ErrorStyles'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ErrorNetworkRequestFailure({
  url,
  status,
  statusText,
}: {
  url: string
  status: number
  statusText?: string
}) {
  const { t } = useTranslationSafe()

  const statusMessage = getHttpStatusText(t, status) ?? statusText

  return (
    <ErrorContainer>
      <h5>{t('An error has occurred: Network request failed')}</h5>

      <section className="mt-3">
        <div>{t('We tried to download the file from')}</div>
        <div>
          <LinkExternal href={url}>{url}</LinkExternal>
        </div>
        <div>{t('and the connection was successful, but the remote server replied with the following error:')}</div>
        <div className="text-danger">{statusMessage}</div>
      </section>
    </ErrorContainer>
  )
}

export function getHttpStatusText(t: TFunctionInterface, status: number): string | undefined {
  const statusTexts = new Map<number, string>([
    [200, t('Success')],
    [
      400,
      t(
        'Bad Request. The server cannot or will not process the request due to client error. (HTTP status code: {{status}})',
        { status },
      ),
    ],
    [
      401,
      t('Unauthorized. Authentication is required in order to use this resource. (HTTP status code: {{status}})', {
        status,
      }),
    ],
    [
      403,
      t("Forbidden. You don't have necessary permissions to access this resource. (HTTP status code: {{status}})", {
        status,
      }),
    ],
    [
      404,
      t(
        'The requested resource was not found. Please check the correctness of the address. (HTTP status code: {{status}})',
        {
          status,
        },
      ),
    ],
  ])

  if (status >= 500) {
    return t(
      'Server error. There was an error on the remote server. Please contact your sever administrator. (HTTP status code: {{status}})',
      { status },
    )
  }

  return statusTexts.get(status)
}
