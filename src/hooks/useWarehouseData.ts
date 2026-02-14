import { useMemo } from 'react'
import { generateWarehouseData } from '../data/generateWarehouseData'
import type { WarehouseData, WarehouseItem, WarehouseLayout } from '../types/warehouse'

interface UseWarehouseDataOptions {
  layout: WarehouseLayout
  importedItems?: WarehouseItem[] | null
}

export function partitionWarehouseItems(items: WarehouseItem[]): WarehouseData {
  return {
    items,
    occupied: items.filter((item) => item.status === 'occupied'),
    empty: items.filter((item) => item.status === 'empty'),
  }
}

export function useWarehouseData({ layout, importedItems = null }: UseWarehouseDataOptions): WarehouseData {
  return useMemo(() => {
    if (importedItems) {
      return partitionWarehouseItems(importedItems)
    }

    return partitionWarehouseItems(generateWarehouseData(layout))
  }, [layout, importedItems])
}
