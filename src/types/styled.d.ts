/* eslint-disable @typescript-eslint/no-empty-interface */
import type { HTMLProps } from 'react'
import type { Theme } from 'src/theme'

declare module 'styled-components' {
  export declare interface DefaultTheme extends Theme {}

  export type StyledHtmlProps<T extends HTMLElement> = Omit<HTMLProps<T>, 'children' | 'ref' | 'as'>
  export type StyledSvgProps<T extends SVGElement> = Omit<HTMLProps<T>, 'children' | 'ref' | 'as'>
}
