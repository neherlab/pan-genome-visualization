import React, { ComponentProps, useMemo } from 'react'
import { Group, Rect, Text } from 'react-konva'
import { getAminoacidColor } from 'src/helpers/getAminoacidColor'
import { getNucleotideColor } from 'src/helpers/getNucleotideColor'
import { getTextColor } from 'src/helpers/getTextColor'
import { useTheme } from 'styled-components'

export const MSA_CHAR_HEIGHT = 20
export const MSA_CHAR_WIDTH = 20
export const MSA_CHAR_FONT_SIZE = 14

export interface MsaCharacterProps extends ComponentProps<typeof Group> {
  character: string
  showAa: boolean
}

export function MsaCharacter({ character, showAa, ...restProps }: MsaCharacterProps) {
  const theme = useTheme()
  const { textColor, fillColor } = useMemo(() => {
    const fillColor = showAa ? getAminoacidColor(character) : getNucleotideColor(character)
    return { textColor: getTextColor(theme, fillColor), fillColor }
  }, [character, showAa, theme])

  const text = useMemo(() => {
    if (character === ' ') {
      return null
    }

    return (
      <>
        <Rect
          width={MSA_CHAR_WIDTH}
          height={MSA_CHAR_HEIGHT}
          fill={fillColor}
          strokeWidth={0.5}
          stroke="#ccca"
          perfectDrawEnabled={false}
        />
        <Text
          width={MSA_CHAR_WIDTH}
          height={MSA_CHAR_HEIGHT}
          fill={textColor}
          text={character}
          fontSize={MSA_CHAR_FONT_SIZE}
          fontFamily="monospace"
          align="center"
          verticalAlign="middle"
          perfectDrawEnabled={false}
        />
      </>
    )
  }, [character, fillColor, textColor])

  return <Group {...restProps}>{text}</Group>
}
