import type { RefObject } from 'react'
import type { Placement } from 'popper.js/index'
import type { PopoverProps as PopoverPropsBase } from 'reactstrap/lib/index'

export * from 'reactstrap/lib/index'

export interface PopoverProps extends PopoverPropsBase {
  target: string | HTMLElement | RefObject<HTMLElement> | RefObject<SVGElement>
  container?: string | HTMLElement | RefObject<HTMLElement> | RefObject<SVGElement>
  placement?: Placement
}
