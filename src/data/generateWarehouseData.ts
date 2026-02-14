import { DEFAULT_LAYOUT, type WarehouseItem, type WarehouseLayout } from '../types/warehouse'

function generateSku(): string {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const number = Math.floor(Math.random() * 90000 + 10000)
  return `${prefix}-${number}`
}

export function generateWarehouseData(layout: WarehouseLayout = DEFAULT_LAYOUT): WarehouseItem[] {
  const items: WarehouseItem[] = []

  const rowCenterOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
  const colCenterOffset = ((layout.cols - 1) * layout.colSpacing) / 2
  const levelOffset = layout.levelHeight / 2

  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      for (let level = 0; level < layout.levels; level += 1) {
        const isOccupied = Math.random() > 0.3
        const x = col * layout.colSpacing - colCenterOffset
        const y = level * layout.levelHeight + levelOffset
        const z = row * layout.rowSpacing - rowCenterOffset

        items.push({
          id: `R${row + 1}-C${col + 1}-L${level + 1}`,
          position: [x, y, z],
          status: isOccupied ? 'occupied' : 'empty',
          sku: isOccupied ? generateSku() : undefined,
        })
      }
    }
  }

  return items
}
