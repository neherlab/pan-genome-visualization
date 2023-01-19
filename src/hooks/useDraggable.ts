/* eslint-disable react-hooks/exhaustive-deps */
import React, { useLayoutEffect, useEffect, useRef, RefObject } from 'react'

export type UseDraggableOptions = {
  decayRate?: number
  safeDisplacement?: number
  applyRubberBandEffect?: boolean | 'x' | 'y' | 'xy'
  activeMouseButton?: 'Left' | 'Middle' | 'Right'
  isMounted?: boolean
}

export type UseDraggableResult<T extends HTMLElement | SVGElement> = {
  events: {
    onMouseDown: (e: React.MouseEvent<T>) => void
  }
}

export function useDraggable<T extends HTMLElement | SVGElement>(
  ref: RefObject<T>,
  {
    decayRate = 0.95,
    safeDisplacement = 10,
    applyRubberBandEffect = false,
    activeMouseButton = 'Left',
    isMounted = true,
  }: UseDraggableOptions = {},
): UseDraggableResult<T> {
  const internalState = useRef({
    isMouseDown: false,
    isDraggingX: false,
    isDraggingY: false,
    initialMouseX: 0,
    initialMouseY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    scrollSpeedX: 0,
    scrollSpeedY: 0,
    lastScrollX: 0,
    lastScrollY: 0,
  })

  let isScrollableAlongX = false
  let isScrollableAlongY = false
  let maxHorizontalScroll = 0
  let maxVerticalScroll = 0
  let cursorStyleOfWrapperElement: string
  let cursorStyleOfChildElements: string[]
  let transformStyleOfChildElements: string[]
  let transitionStyleOfChildElements: string[]

  const timing = (1 / 60) * 1000 // period of most monitors (60fps)

  useLayoutEffect(() => {
    if (isMounted && ref.current) {
      isScrollableAlongX = window.getComputedStyle(ref.current).overflowX === 'scroll'
      isScrollableAlongY = window.getComputedStyle(ref.current).overflowY === 'scroll'

      maxHorizontalScroll = ref.current.scrollWidth - ref.current.clientWidth
      maxVerticalScroll = ref.current.scrollHeight - ref.current.clientHeight

      cursorStyleOfWrapperElement = window.getComputedStyle(ref.current).cursor

      cursorStyleOfChildElements = []
      transformStyleOfChildElements = []
      transitionStyleOfChildElements = []
      ;(ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement) => {
        cursorStyleOfChildElements.push(window.getComputedStyle(child).cursor)

        transformStyleOfChildElements.push(
          window.getComputedStyle(child).transform === 'none' ? '' : window.getComputedStyle(child).transform,
        )

        transitionStyleOfChildElements.push(
          window.getComputedStyle(child).transition === 'none' ? '' : window.getComputedStyle(child).transition,
        )
      })
    }
  }, [isMounted])

  const runScroll = () => {
    if (ref.current) {
      const dx = internalState.current.scrollSpeedX * timing
      const dy = internalState.current.scrollSpeedY * timing
      const offsetX = ref.current.scrollLeft + dx
      const offsetY = ref.current.scrollTop + dy

      ref.current.scrollLeft = offsetX
      ref.current.scrollTop = offsetY
      internalState.current.lastScrollX = offsetX
      internalState.current.lastScrollY = offsetY
    }
  }

  const rubberBandCallback = (e: MouseEvent) => {
    if (ref.current) {
      const dx = e.clientX - internalState.current.initialMouseX
      const dy = e.clientY - internalState.current.initialMouseY

      const { clientWidth, clientHeight, childNodes } = ref.current

      const applyToX =
        isScrollableAlongX &&
        (applyRubberBandEffect === true ||
          (typeof applyRubberBandEffect === 'string' && applyRubberBandEffect.includes('x')))

      const displacementX = applyToX
        ? 0.3 * clientWidth * Math.sign(dx) * Math.log10(1.0 + (0.5 * Math.abs(dx)) / clientWidth)
        : 0

      const applyToY =
        isScrollableAlongY &&
        (applyRubberBandEffect === true ||
          (typeof applyRubberBandEffect === 'string' && applyRubberBandEffect.includes('y')))

      const displacementY = applyToY
        ? 0.3 * clientHeight * Math.sign(dy) * Math.log10(1.0 + (0.5 * Math.abs(dy)) / clientHeight)
        : 0

      ;(childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement) => {
        child.style.transform = `translate3d(${displacementX}px, ${displacementY}px, 0px)`
        child.style.transition = 'transform 0ms'
      })
    }
  }

  const recoverChildStyle = () => {
    if (ref.current) {
      ;(ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement, i) => {
        child.style.transform = transformStyleOfChildElements[i]
        child.style.transition = transitionStyleOfChildElements[i]
      })
    }
  }

  let rubberBandAnimationTimer: NodeJS.Timeout
  let keepMovingX: NodeJS.Timer
  let keepMovingY: NodeJS.Timer

  const callbackMomentum = () => {
    const minimumSpeedToTriggerMomentum = 0.05

    keepMovingX = setInterval(() => {
      if (ref.current) {
        const lastScrollSpeedX = internalState.current.scrollSpeedX
        const newScrollSpeedX = lastScrollSpeedX * decayRate
        internalState.current.scrollSpeedX = newScrollSpeedX

        const isAtLeft = ref.current.scrollLeft <= 0
        const isAtRight = ref.current.scrollLeft >= maxHorizontalScroll
        const hasReachedHorizontalEdges = isAtLeft || isAtRight

        runScroll()

        if (
          Math.abs(newScrollSpeedX) < minimumSpeedToTriggerMomentum ||
          internalState.current.isMouseDown ||
          hasReachedHorizontalEdges
        ) {
          internalState.current.scrollSpeedX = 0
          clearInterval(keepMovingX)
        }
      }
    }, timing)

    keepMovingY = setInterval(() => {
      if (ref.current) {
        const lastScrollSpeedY = internalState.current.scrollSpeedY
        const newScrollSpeedY = lastScrollSpeedY * decayRate
        internalState.current.scrollSpeedY = newScrollSpeedY

        const isAtTop = ref.current.scrollTop <= 0
        const isAtBottom = ref.current.scrollTop >= maxVerticalScroll
        const hasReachedVerticalEdges = isAtTop || isAtBottom

        runScroll()

        if (
          Math.abs(newScrollSpeedY) < minimumSpeedToTriggerMomentum ||
          internalState.current.isMouseDown ||
          hasReachedVerticalEdges
        ) {
          internalState.current.scrollSpeedY = 0
          clearInterval(keepMovingY)
        }
      }
    }, timing)

    internalState.current.isDraggingX = false
    internalState.current.isDraggingY = false

    if (applyRubberBandEffect && ref.current) {
      const transitionDurationInMilliseconds = 250

      ;(ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement) => {
        child.style.transform = `translate3d(0px, 0px, 0px)`
        child.style.transition = `transform ${transitionDurationInMilliseconds}ms`
      })

      rubberBandAnimationTimer = setTimeout(recoverChildStyle, transitionDurationInMilliseconds)
    }
  }

  const preventClick = (e: Event) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    // e.stopPropagation();
  }

  const getIsMousePressActive = (buttonsCode: number) => {
    return (
      (activeMouseButton === 'Left' && buttonsCode === 1) ||
      (activeMouseButton === 'Middle' && buttonsCode === 4) ||
      (activeMouseButton === 'Right' && buttonsCode === 2)
    )
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const isMouseActive = getIsMousePressActive(e.buttons)
    if (!isMouseActive) {
      return
    }

    internalState.current.isMouseDown = true
    internalState.current.lastMouseX = e.clientX
    internalState.current.lastMouseY = e.clientY
    internalState.current.initialMouseX = e.clientX
    internalState.current.initialMouseY = e.clientY
  }

  const onMouseUp = (e: MouseEvent) => {
    const isDragging = internalState.current.isDraggingX || internalState.current.isDraggingY

    const dx = internalState.current.initialMouseX - e.clientX
    const dy = internalState.current.initialMouseY - e.clientY

    const isMotionIntentional = Math.abs(dx) > safeDisplacement || Math.abs(dy) > safeDisplacement

    const isDraggingConfirmed = isDragging && isMotionIntentional

    if (ref.current) {
      if (isDraggingConfirmed) {
        ref.current.childNodes.forEach((child) => {
          child.addEventListener('click', preventClick)
        })
      } else {
        ref.current.childNodes.forEach((child) => {
          child.removeEventListener('click', preventClick)
        })
      }

      internalState.current.isMouseDown = false
      internalState.current.lastMouseX = 0
      internalState.current.lastMouseY = 0

      ref.current.style.cursor = cursorStyleOfWrapperElement
      ;(ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement, i) => {
        child.style.cursor = cursorStyleOfChildElements[i]
      })

      if (isDraggingConfirmed) {
        callbackMomentum()
      }
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!internalState.current.isMouseDown) {
      return
    }

    e.preventDefault()

    const dx = internalState.current.lastMouseX - e.clientX
    internalState.current.lastMouseX = e.clientX

    internalState.current.scrollSpeedX = dx / timing
    internalState.current.isDraggingX = true

    const dy = internalState.current.lastMouseY - e.clientY
    internalState.current.lastMouseY = e.clientY

    internalState.current.scrollSpeedY = dy / timing
    internalState.current.isDraggingY = true

    if (ref.current) {
      ref.current.style.cursor = 'grabbing'
      ;(ref.current.childNodes as NodeListOf<HTMLOptionElement>).forEach((child: HTMLElement) => {
        child.style.cursor = 'grabbing'
      })

      const isAtLeft = ref.current.scrollLeft <= 0 && isScrollableAlongX
      const isAtRight = ref.current.scrollLeft >= maxHorizontalScroll && isScrollableAlongX
      const isAtTop = ref.current.scrollTop <= 0 && isScrollableAlongY
      const isAtBottom = ref.current.scrollTop >= maxVerticalScroll && isScrollableAlongY
      const isAtAnEdge = isAtLeft || isAtRight || isAtTop || isAtBottom

      if (isAtAnEdge && applyRubberBandEffect) {
        rubberBandCallback(e)
      }
    }

    runScroll()
  }

  const handleResize = () => {
    if (ref.current) {
      maxHorizontalScroll = ref.current.scrollWidth - ref.current.clientWidth
      maxVerticalScroll = ref.current.scrollHeight - ref.current.clientHeight
    }
  }

  useEffect(() => {
    if (isMounted) {
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', handleResize)

      clearInterval(keepMovingX)
      clearInterval(keepMovingY)
      clearTimeout(rubberBandAnimationTimer)
    }
  }, [isMounted])

  return { events: { onMouseDown } }
}
