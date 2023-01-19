import { MDXProviderComponents } from '@mdx-js/react'

import { LinkSmart } from 'src/components/Link/LinkSmart'

export const mdxComponents = {
  a: LinkSmart,
}

export function getMdxComponents(components: MDXProviderComponents): MDXProviderComponents {
  return { ...components, ...mdxComponents }
}
