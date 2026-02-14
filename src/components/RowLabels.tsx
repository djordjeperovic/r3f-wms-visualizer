import { Text } from '@react-three/drei'
import type { WarehouseLayout } from '../types/warehouse'

interface RowLabelsProps {
  layout: WarehouseLayout
  color: string
}

export function RowLabels({ layout, color }: RowLabelsProps) {
  const rowOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
  const colOffset = ((layout.cols - 1) * layout.colSpacing) / 2
  const rowLabelX = -colOffset - 2.5
  const colLabelZ = -rowOffset - 2.5

  return (
    <>
      {Array.from({ length: layout.rows }, (_, row) => (
        <Text
          key={`row-${row}`}
          position={[rowLabelX, 0.5, row * layout.rowSpacing - rowOffset]}
          fontSize={0.55}
          color={color}
          anchorX="right"
          anchorY="middle"
        >
          {`Row ${row + 1}`}
        </Text>
      ))}

      {Array.from({ length: layout.cols }, (_, col) => (
        <Text
          key={`col-${col}`}
          position={[col * layout.colSpacing - colOffset, 0.5, colLabelZ]}
          fontSize={0.5}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {`C${col + 1}`}
        </Text>
      ))}
    </>
  )
}
