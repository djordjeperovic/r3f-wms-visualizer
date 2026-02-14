import { useMemo } from 'react'
import { generateWarehouseData } from '../data/generateWarehouseData'
import type { WarehouseData } from '../types/warehouse'

export function useWarehouseData(): WarehouseData {
  return useMemo(() => {
    const items = generateWarehouseData()

    return {
      items,
      occupied: items.filter((item) => item.status === 'occupied'),
      empty: items.filter((item) => item.status === 'empty'),
    }
  }, [])
}
