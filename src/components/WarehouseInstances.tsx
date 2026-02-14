import { Html } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Dispatch, type SetStateAction } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ThemeConfig } from '../hooks/useTheme'
import type { ContextMenuState, StatusFilter, VizMode, WarehouseItem } from '../types/warehouse'

const tempObject = new THREE.Object3D()
const NO_RAYCAST: THREE.Object3D['raycast'] = () => {
  // Disable intersections when a mesh is hidden.
}

const COLOR_HIGHLIGHT = new THREE.Color('#facc15')
const COLOR_SELECTED = new THREE.Color('#22c55e')
const COLOR_HEATMAP_LOW = new THREE.Color('#22c55e')
const COLOR_HEATMAP_MID = new THREE.Color('#eab308')
const COLOR_HEATMAP_HIGH = new THREE.Color('#ef4444')

type MeshType = 'occupied' | 'empty'

interface HoveredInstance {
  meshType: MeshType
  id: number
}

interface WarehouseInstancesProps {
  occupied: WarehouseItem[]
  empty: WarehouseItem[]
  showEmpty: boolean
  statusFilter: StatusFilter
  selectedItems: WarehouseItem[]
  onSelectItems: Dispatch<SetStateAction<WarehouseItem[]>>
  searchQuery: string
  vizMode: VizMode
  onContextMenu: (state: ContextMenuState) => void
  themeConfig: ThemeConfig
}

function parseRowCol(id: string) {
  const match = /^R(\d+)-C(\d+)-L\d+$/i.exec(id)
  if (!match) return null

  return {
    row: Number(match[1]),
    col: Number(match[2]),
  }
}

function matchesSearch(item: WarehouseItem, query: string) {
  if (!query) return true

  const idMatch = item.id.toLowerCase().includes(query)
  const skuMatch = item.sku?.toLowerCase().includes(query) ?? false
  return idMatch || skuMatch
}

function getHeatmapColor(density: number) {
  const color = new THREE.Color()
  if (density < 0.5) {
    color.lerpColors(COLOR_HEATMAP_LOW, COLOR_HEATMAP_MID, density * 2)
    return color
  }

  color.lerpColors(COLOR_HEATMAP_MID, COLOR_HEATMAP_HIGH, (density - 0.5) * 2)
  return color
}

export function WarehouseInstances({
  occupied,
  empty,
  showEmpty,
  statusFilter,
  selectedItems,
  onSelectItems,
  searchQuery,
  vizMode,
  onContextMenu,
  themeConfig,
}: WarehouseInstancesProps) {
  const occupiedMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const emptyMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const emptyWireframeRef = useRef<THREE.InstancedMesh | null>(null)
  const [hovered, setHovered] = useState<HoveredInstance | null>(null)

  const colorOccupied = useMemo(() => new THREE.Color(themeConfig.occupiedColor), [themeConfig.occupiedColor])
  const colorEmpty = useMemo(() => new THREE.Color(themeConfig.emptyColor), [themeConfig.emptyColor])
  const colorDim = useMemo(() => new THREE.Color(themeConfig.dimColor), [themeConfig.dimColor])
  const query = searchQuery.trim().toLowerCase()
  const selectedSet = useMemo(() => new Set(selectedItems.map((item) => item.id)), [selectedItems])

  const densityById = useMemo(() => {
    const rowStats = new Map<number, { occupied: number; total: number }>()
    const colStats = new Map<number, { occupied: number; total: number }>()
    const allItems = [...occupied, ...empty]

    allItems.forEach((item) => {
      const rowCol = parseRowCol(item.id)
      if (!rowCol) return

      const rowEntry = rowStats.get(rowCol.row) ?? { occupied: 0, total: 0 }
      rowEntry.total += 1
      if (item.status === 'occupied') rowEntry.occupied += 1
      rowStats.set(rowCol.row, rowEntry)

      const colEntry = colStats.get(rowCol.col) ?? { occupied: 0, total: 0 }
      colEntry.total += 1
      if (item.status === 'occupied') colEntry.occupied += 1
      colStats.set(rowCol.col, colEntry)
    })

    const densityMap = new Map<string, number>()
    allItems.forEach((item) => {
      const rowCol = parseRowCol(item.id)
      if (!rowCol) {
        densityMap.set(item.id, 0)
        return
      }

      const rowEntry = rowStats.get(rowCol.row)
      const colEntry = colStats.get(rowCol.col)
      const rowDensity = rowEntry ? rowEntry.occupied / Math.max(rowEntry.total, 1) : 0
      const colDensity = colEntry ? colEntry.occupied / Math.max(colEntry.total, 1) : 0
      densityMap.set(item.id, (rowDensity + colDensity) / 2)
    })

    return densityMap
  }, [occupied, empty])

  const showOccupiedMesh = statusFilter !== 'empty'
  const showEmptyMesh = statusFilter === 'empty' || (statusFilter === 'all' && showEmpty)

  useLayoutEffect(() => {
    const occupiedMesh = occupiedMeshRef.current
    if (occupiedMesh) {
      for (let index = 0; index < occupied.length; index += 1) {
        const item = occupied[index]
        tempObject.position.set(...item.position)
        tempObject.updateMatrix()
        occupiedMesh.setMatrixAt(index, tempObject.matrix)
      }
      occupiedMesh.instanceMatrix.needsUpdate = true
    }

    const emptyMesh = emptyMeshRef.current
    const emptyWireframeMesh = emptyWireframeRef.current
    if (emptyMesh && emptyWireframeMesh) {
      for (let index = 0; index < empty.length; index += 1) {
        const item = empty[index]
        tempObject.position.set(...item.position)
        tempObject.updateMatrix()
        emptyMesh.setMatrixAt(index, tempObject.matrix)
        emptyWireframeMesh.setMatrixAt(index, tempObject.matrix)
      }

      emptyMesh.instanceMatrix.needsUpdate = true
      emptyWireframeMesh.instanceMatrix.needsUpdate = true
    }
  }, [occupied, empty])

  useEffect(() => {
    const occupiedMesh = occupiedMeshRef.current
    const emptyMesh = emptyMeshRef.current

    if (occupiedMesh) {
      for (let index = 0; index < occupied.length; index += 1) {
        const item = occupied[index]
        const isHovered = hovered?.meshType === 'occupied' && hovered.id === index
        const isSelected = selectedSet.has(item.id)
        const matches = matchesSearch(item, query)

        let color =
          vizMode === 'heatmap'
            ? getHeatmapColor(densityById.get(item.id) ?? 0)
            : colorOccupied.clone()

        if (query && !matches) color = colorDim.clone()
        if (isSelected) color = COLOR_SELECTED.clone()
        if (isHovered) color = COLOR_HIGHLIGHT.clone()

        occupiedMesh.setColorAt(index, color)
      }

      if (occupiedMesh.instanceColor) occupiedMesh.instanceColor.needsUpdate = true
    }

    if (emptyMesh) {
      for (let index = 0; index < empty.length; index += 1) {
        const item = empty[index]
        const isHovered = hovered?.meshType === 'empty' && hovered.id === index
        const isSelected = selectedSet.has(item.id)
        const matches = matchesSearch(item, query)

        let color =
          vizMode === 'heatmap'
            ? getHeatmapColor(densityById.get(item.id) ?? 0)
            : colorEmpty.clone()

        if (query && !matches) color = colorDim.clone()
        if (isSelected) color = COLOR_SELECTED.clone()
        if (isHovered) color = COLOR_HIGHLIGHT.clone()

        emptyMesh.setColorAt(index, color)
      }

      if (emptyMesh.instanceColor) emptyMesh.instanceColor.needsUpdate = true
    }
  }, [occupied, empty, hovered, selectedSet, query, vizMode, densityById, colorOccupied, colorEmpty, colorDim])

  const handlePointerOver = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const instanceId = event.instanceId
      if (instanceId === undefined) return
      setHovered({ meshType, id: instanceId })
    },
    [],
  )

  const handlePointerOut = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const instanceId = event.instanceId
      if (instanceId === undefined) return

      setHovered((current) => {
        if (!current) return current
        if (current.meshType !== meshType || current.id !== instanceId) return current
        return null
      })
    },
    [],
  )

  const handleClick = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const instanceId = event.instanceId
      if (instanceId === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[instanceId]
      if (!item) return

      if (event.nativeEvent.shiftKey) {
        onSelectItems((previous) => {
          if (previous.some((selectedItem) => selectedItem.id === item.id)) {
            return previous.filter((selectedItem) => selectedItem.id !== item.id)
          }

          return [...previous, item]
        })
        return
      }

      onSelectItems((previous) => {
        if (previous.length === 1 && previous[0].id === item.id) return []
        return [item]
      })
    },
    [occupied, empty, onSelectItems],
  )

  const handleContextMenu = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      event.nativeEvent.preventDefault()

      const instanceId = event.instanceId
      if (instanceId === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[instanceId]
      if (!item) return

      const contextState: ContextMenuState = {
        item,
        position: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
      }
      onContextMenu(contextState)
    },
    [occupied, empty, onContextMenu],
  )

  const hoveredItem = useMemo(() => {
    if (!hovered) return null
    if (hovered.meshType === 'occupied' && !showOccupiedMesh) return null
    if (hovered.meshType === 'empty' && !showEmptyMesh) return null

    const source = hovered.meshType === 'occupied' ? occupied : empty
    return source[hovered.id] ?? null
  }, [hovered, occupied, empty, showOccupiedMesh, showEmptyMesh])

  return (
    <>
      <instancedMesh
        ref={occupiedMeshRef}
        args={[undefined, undefined, occupied.length]}
        visible={showOccupiedMesh}
        raycast={showOccupiedMesh ? undefined : NO_RAYCAST}
        onPointerOver={showOccupiedMesh ? handlePointerOver('occupied') : undefined}
        onPointerOut={showOccupiedMesh ? handlePointerOut('occupied') : undefined}
        onClick={showOccupiedMesh ? handleClick('occupied') : undefined}
        onContextMenu={showOccupiedMesh ? handleContextMenu('occupied') : undefined}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.6, 1, 1.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </instancedMesh>

      <group visible={showEmptyMesh}>
        <instancedMesh
          ref={emptyMeshRef}
          args={[undefined, undefined, empty.length]}
          raycast={showEmptyMesh ? undefined : NO_RAYCAST}
          onPointerOver={showEmptyMesh ? handlePointerOver('empty') : undefined}
          onPointerOut={showEmptyMesh ? handlePointerOut('empty') : undefined}
          onClick={showEmptyMesh ? handleClick('empty') : undefined}
          onContextMenu={showEmptyMesh ? handleContextMenu('empty') : undefined}
          renderOrder={1}
        >
          <boxGeometry args={[1.6, 1, 1.2]} />
          <meshStandardMaterial transparent opacity={0.1} depthWrite={false} color="#ffffff" />
        </instancedMesh>

        <instancedMesh
          ref={emptyWireframeRef}
          args={[undefined, undefined, empty.length]}
          raycast={showEmptyMesh ? undefined : NO_RAYCAST}
          renderOrder={2}
        >
          <boxGeometry args={[1.605, 1.005, 1.205]} />
          <meshBasicMaterial wireframe color={themeConfig.labelColor} transparent opacity={0.3} />
        </instancedMesh>
      </group>

      {hoveredItem && (
        <Html
          position={[hoveredItem.position[0], hoveredItem.position[1] + 0.8, hoveredItem.position[2]]}
          center
          distanceFactor={20}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg"
            style={{ background: themeConfig.tooltipBg, color: themeConfig.tooltipText }}
          >
            {hoveredItem.id}
            {hoveredItem.sku ? ` • ${hoveredItem.sku}` : ''}
          </div>
        </Html>
      )}
    </>
  )
}
