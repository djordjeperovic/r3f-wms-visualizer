import type { WarehouseItem } from '../types/warehouse'

const ROWS = 10
const COLS = 11
const LEVELS = 5

const ROW_SPACING = 4
const COL_SPACING = 2
const LEVEL_HEIGHT = 1.5
const LEVEL_OFFSET = 0.75

function generateSku(): string {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const number = Math.floor(Math.random() * 90000 + 10000)
  return `${prefix}-${number}`
}

export function generateWarehouseData(): WarehouseItem[] {
  const items: WarehouseItem[] = []

  const rowCenterOffset = ((ROWS - 1) * ROW_SPACING) / 2
  const colCenterOffset = ((COLS - 1) * COL_SPACING) / 2

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      for (let level = 0; level < LEVELS; level += 1) {
        const isOccupied = Math.random() > 0.3
        const x = col * COL_SPACING - colCenterOffset
        const y = level * LEVEL_HEIGHT + LEVEL_OFFSET
        const z = row * ROW_SPACING - rowCenterOffset

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
