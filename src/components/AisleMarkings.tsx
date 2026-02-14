import type { WarehouseLayout } from '../types/warehouse'

interface AisleMarkingsProps {
  layout: WarehouseLayout
  color: string
}

export function AisleMarkings({ layout, color }: AisleMarkingsProps) {
  const rowCenterOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
  const width = layout.cols * layout.colSpacing + 4

  return (
    <>
      {Array.from({ length: Math.max(layout.rows - 1, 0) }, (_, index) => {
        const z = (index + 0.5) * layout.rowSpacing - rowCenterOffset

        return (
          <mesh key={`aisle-${index}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, 0.35]} />
            <meshBasicMaterial color={color} transparent opacity={0.16} />
          </mesh>
        )
      })}
    </>
  )
}
