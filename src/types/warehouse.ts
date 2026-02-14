export type WarehouseStatus = 'occupied' | 'empty'

export interface WarehouseItem {
  id: string
  position: [number, number, number]
  status: WarehouseStatus
  sku?: string
}

export interface WarehouseData {
  items: WarehouseItem[]
  occupied: WarehouseItem[]
  empty: WarehouseItem[]
}

export interface WarehouseLayout {
  rows: number
  cols: number
  levels: number
  rowSpacing: number
  colSpacing: number
  levelHeight: number
}

export const DEFAULT_LAYOUT: WarehouseLayout = {
  rows: 10,
  cols: 11,
  levels: 5,
  rowSpacing: 4,
  colSpacing: 2,
  levelHeight: 1.5,
}

export type StatusFilter = 'all' | WarehouseStatus
export type VizMode = 'status' | 'heatmap'
export type ShadowQuality = 'high' | 'low' | 'off'
export type Theme = 'dark' | 'light'

export interface CameraView {
  position: [number, number, number]
  target: [number, number, number]
}

export interface ContextMenuState {
  item: WarehouseItem
  position: {
    x: number
    y: number
  }
}
