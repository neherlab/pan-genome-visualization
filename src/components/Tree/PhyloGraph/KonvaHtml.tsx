import React, { ComponentProps, PropsWithChildren, useMemo } from 'react'
import { Html } from 'react-konva-utils'
import { useContextBridge } from 'its-fine'
import { Portal } from 'react-portal'

/** Allows placing DOM elements inside react-konva's component tree */
export function KonvaHtml({ children, ...restProps }: PropsWithChildren<ComponentProps<typeof Html>>) {
  // HACK: bridge React contexts from various providers through to the Html
  // See:
  //  - https://github.com/konvajs/react-konva/issues/188
  //  - https://github.com/konvajs/react-konva-utils/issues/15
  const Bridge = useContextBridge()

  return (
    <Html {...restProps}>
      <Bridge>{children}</Bridge>
    </Html>
  )
}

export interface KonvaHtmlPortalProps extends PropsWithChildren<ComponentProps<typeof Html>> {
  target?: Element | string | null
}

/** Allows placing DOM elements inside react-konva's tree, but rendering in a portal */
export function KonvaHtmlPortal({ children, target, ...restProps }: KonvaHtmlPortalProps) {
  // HACK: bridge React contexts from various providers through to the Html
  // See:
  //  - https://github.com/konvajs/react-konva/issues/188
  //  - https://github.com/konvajs/react-konva-utils/issues/15
  const Bridge = useContextBridge()

  const targetElement = useMemo(() => {
    if (typeof target === 'string') {
      return document?.getElementById('overlay-anchor')
    }
    return target
  }, [target])

  return (
    <Html {...restProps}>
      <Portal node={targetElement}>
        <Bridge>{children}</Bridge>
      </Portal>
    </Html>
  )
}
