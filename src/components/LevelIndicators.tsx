import { Line } from '@react-three/drei'
import type { WarehouseLayout } from '../types/warehouse'

interface LevelIndicatorsProps {
  layout: WarehouseLayout
  color: string
}

export function LevelIndicators({ layout, color }: LevelIndicatorsProps) {
  const rowOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
  const colOffset = ((layout.cols - 1) * layout.colSpacing) / 2
  const halfWidth = colOffset + 2
  const halfDepth = rowOffset + 2

  return (
    <>
      {Array.from({ length: layout.levels }, (_, level) => {
        const y = level * layout.levelHeight + layout.levelHeight / 2

        return (
          <Line
            key={`level-${level}`}
            points={[
              [-halfWidth, y, -halfDepth],
              [halfWidth, y, -halfDepth],
              [halfWidth, y, halfDepth],
              [-halfWidth, y, halfDepth],
              [-halfWidth, y, -halfDepth],
            ]}
            color={color}
            lineWidth={0.5}
            transparent
            opacity={0.35}
          />
        )
      })}
    </>
  )
}
