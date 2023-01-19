import { flexRender, Row as ReactTableRow } from '@tanstack/react-table'
import React, { useCallback } from 'react'
import { ConnectableElement, useDrag, useDrop } from 'react-dnd'
import { Td, Tr } from 'src/components/Table/TableStyles'

export interface TableRowProps<T> {
  row: ReactTableRow<T>
  isHighlighted: boolean
  onClick?: () => void
  onRowReorder: (srcRowIndex: number, dstRowIndex: number) => void
}

export function TableRow<T>({ row, isHighlighted, onClick, onRowReorder }: TableRowProps<T>) {
  const [{ canDrop, isDragOver }, dropRef] = useDrop({
    accept: 'row',
    drop: (draggedRow: ReactTableRow<T>) => onRowReorder(draggedRow.index, row.index),
    canDrop: () => true,
    collect: (monitor) => ({
      isDragOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    item: () => row,
    type: 'row',
  })

  const attachRef = useCallback(
    (element: ConnectableElement) => {
      dragRef(element)
      dropRef(element)
      previewRef(element)
    },
    [dragRef, dropRef, previewRef],
  )

  return (
    <Tr
      ref={attachRef}
      onClick={onClick}
      $isHighlighted={isHighlighted}
      $isDragging={isDragging}
      $canDrop={canDrop}
      $isDragOver={isDragOver}
    >
      {row.getVisibleCells().map((cell) => {
        return (
          <Td key={cell.id} $isHighlighted={isHighlighted}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Td>
        )
      })}
    </Tr>
  )
}
