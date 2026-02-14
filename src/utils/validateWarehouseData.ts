import type { WarehouseItem } from '../types/warehouse'

function isNumberTuple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  )
}

export function validateWarehouseItems(data: unknown): data is WarehouseItem[] {
  if (!Array.isArray(data)) return false

  return data.every((item) => {
    if (!item || typeof item !== 'object') return false

    const candidate = item as Partial<WarehouseItem>
    const hasValidStatus = candidate.status === 'occupied' || candidate.status === 'empty'
    const hasValidSku = candidate.sku === undefined || typeof candidate.sku === 'string'

    return (
      typeof candidate.id === 'string' &&
      isNumberTuple(candidate.position) &&
      hasValidStatus &&
      hasValidSku
    )
  })
}
