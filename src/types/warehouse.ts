export interface WarehouseItem {
  id: string
  position: [number, number, number]
  status: 'occupied' | 'empty'
  sku?: string
}

export interface WarehouseData {
  items: WarehouseItem[]
  occupied: WarehouseItem[]
  empty: WarehouseItem[]
}
