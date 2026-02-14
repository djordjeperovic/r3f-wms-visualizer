import { useMemo } from 'react'
import type { WarehouseItem, WarehouseLayout } from '../types/warehouse'

interface MiniMapProps {
  items: WarehouseItem[]
  layout: WarehouseLayout
  selectedIds: string[]
  isLightTheme: boolean
}

export function MiniMap({ items, layout, selectedIds, isLightTheme }: MiniMapProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const width = 128
  const height = 128

  const rowOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
  const colOffset = ((layout.cols - 1) * layout.colSpacing) / 2

  const scaleX = width / (layout.cols * layout.colSpacing + 4)
  const scaleY = height / (layout.rows * layout.rowSpacing + 4)

  return (
    <div
      className={`h-32 w-32 overflow-hidden rounded border ${isLightTheme ? 'border-slate-300 bg-slate-100' : 'border-slate-600 bg-slate-900/70'}`}
      aria-label="Overhead minimap"
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        {items.map((item) => {
          const x = (item.position[0] + colOffset + 2) * scaleX
          const y = (item.position[2] + rowOffset + 2) * scaleY
          const radius = selectedSet.has(item.id) ? 2.2 : 1.2
          const fill = selectedSet.has(item.id)
            ? '#22c55e'
            : item.status === 'occupied'
              ? '#f97316'
              : isLightTheme
                ? '#64748b'
                : '#94a3b8'

          return <circle key={item.id} cx={x} cy={y} r={radius} fill={fill} opacity={0.85} />
        })}
      </svg>
    </div>
  )
}
