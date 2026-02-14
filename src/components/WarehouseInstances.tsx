import { useCallback, useLayoutEffect, useRef, useEffect } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { WarehouseItem } from '../types/warehouse'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

const COLOR_OCCUPIED = new THREE.Color('#e67e22') // Orange
const COLOR_EMPTY = new THREE.Color('#d5d8dc') // Light Gray
const COLOR_HIGHLIGHT = new THREE.Color('#f1c40f') // Yellow (Hover)
const COLOR_SELECTED = new THREE.Color('#2ecc71') // Green (Selected)
const NO_RAYCAST: THREE.Object3D['raycast'] = () => {
  // Intentionally disable intersections while a mesh is hidden.
}

interface WarehouseInstancesProps {
  occupied: WarehouseItem[]
  empty: WarehouseItem[]
  showEmpty: boolean
  selectedItem: WarehouseItem | null
  onSelect: (item: WarehouseItem | null) => void
}

type MeshType = 'occupied' | 'empty'

export function WarehouseInstances({ 
  occupied, 
  empty, 
  showEmpty, 
  selectedItem, 
  onSelect 
}: WarehouseInstancesProps) {
  const occupiedMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const emptyMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const emptyWireframeRef = useRef<THREE.InstancedMesh | null>(null)
  const hoveredEmptyIdRef = useRef<number | null>(null)

  // -- 1. Setup Matrices --
  useLayoutEffect(() => {
    // Setup Occupied
    const occupiedMesh = occupiedMeshRef.current
    if (occupiedMesh) {
      for (let i = 0; i < occupied.length; i++) {
        const item = occupied[i]
        tempObject.position.set(...item.position)
        tempObject.updateMatrix()
        occupiedMesh.setMatrixAt(i, tempObject.matrix)
        occupiedMesh.setColorAt(i, COLOR_OCCUPIED)
      }
      occupiedMesh.instanceMatrix.needsUpdate = true
      if (occupiedMesh.instanceColor) occupiedMesh.instanceColor.needsUpdate = true
    }

    // Setup Empty (Base & Wireframe)
    const emptyMesh = emptyMeshRef.current
    const wireframeMesh = emptyWireframeRef.current
    
    if (emptyMesh && wireframeMesh) {
      for (let i = 0; i < empty.length; i++) {
        const item = empty[i]
        tempObject.position.set(...item.position)
        tempObject.updateMatrix()
        
        // Update both meshes with same matrix
        emptyMesh.setMatrixAt(i, tempObject.matrix)
        wireframeMesh.setMatrixAt(i, tempObject.matrix)
        
        emptyMesh.setColorAt(i, COLOR_EMPTY)
      }
      emptyMesh.instanceMatrix.needsUpdate = true
      wireframeMesh.instanceMatrix.needsUpdate = true
      if (emptyMesh.instanceColor) emptyMesh.instanceColor.needsUpdate = true
    }
  }, [occupied, empty])

  // -- 2. Handle Selection Visuals --
  // We need to re-apply colors whenever selectedItem changes, 
  // but we must be careful not to overwrite hover states if we are hovering.
  // For simplicity, let's just reset all colors and apply selection.
  // Note: This is O(N) but N is usually small enough for a frame update in this context (<10k).
  // Optimization: Track previous selection to only update 2 instances.
  const prevSelectedRef = useRef<WarehouseItem | null>(null)

  useEffect(() => {
    const occupiedMesh = occupiedMeshRef.current
    const emptyMesh = emptyMeshRef.current

    // Reset previous selection
    if (prevSelectedRef.current) {
      const prev = prevSelectedRef.current
      if (prev.status === 'occupied' && occupiedMesh) {
        // Find index (this is slow if array is large, strictly we should map ID -> Index)
        // But here we rely on the fact that 'occupied' array order is stable match for instanceId
        const idx = occupied.findIndex(i => i.id === prev.id)
        if (idx !== -1) {
          occupiedMesh.setColorAt(idx, COLOR_OCCUPIED)
          if (occupiedMesh.instanceColor) occupiedMesh.instanceColor.needsUpdate = true
        }
      } else if (prev.status === 'empty' && emptyMesh) {
        const idx = empty.findIndex(i => i.id === prev.id)
        if (idx !== -1) {
          emptyMesh.setColorAt(idx, COLOR_EMPTY)
          if (emptyMesh.instanceColor) emptyMesh.instanceColor.needsUpdate = true
        }
      }
    }

    // Apply new selection
    if (selectedItem) {
      if (selectedItem.status === 'occupied' && occupiedMesh) {
        const idx = occupied.findIndex(i => i.id === selectedItem.id)
        if (idx !== -1) {
          occupiedMesh.setColorAt(idx, COLOR_SELECTED)
          if (occupiedMesh.instanceColor) occupiedMesh.instanceColor.needsUpdate = true
        }
      } else if (selectedItem.status === 'empty' && emptyMesh) {
        const idx = empty.findIndex(i => i.id === selectedItem.id)
        if (idx !== -1) {
          emptyMesh.setColorAt(idx, COLOR_SELECTED)
          if (emptyMesh.instanceColor) emptyMesh.instanceColor.needsUpdate = true
        }
      }
    }

    prevSelectedRef.current = selectedItem
  }, [selectedItem, occupied, empty])


  // -- 3. Interaction Handlers --
  const paintInstance = useCallback((mesh: THREE.InstancedMesh | null, id: number, color: THREE.Color) => {
    if (!mesh) return
    tempColor.copy(color)
    mesh.setColorAt(id, tempColor)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [])

  const resolveEmptyColor = useCallback((id: number) => {
    const item = empty[id]
    if (!item) return COLOR_EMPTY
    return selectedItem?.id === item.id ? COLOR_SELECTED : COLOR_EMPTY
  }, [empty, selectedItem])

  useEffect(() => {
    if (showEmpty) return

    const hoveredId = hoveredEmptyIdRef.current
    if (hoveredId === null) return

    paintInstance(emptyMeshRef.current, hoveredId, resolveEmptyColor(hoveredId))
    hoveredEmptyIdRef.current = null
  }, [showEmpty, paintInstance, resolveEmptyColor])

  const handlePointerOver = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      if (meshType === 'empty') hoveredEmptyIdRef.current = id
      
      const mesh = meshType === 'occupied' ? occupiedMeshRef.current : emptyMeshRef.current
      paintInstance(mesh, id, COLOR_HIGHLIGHT)
    },
    [paintInstance],
  )

  const handlePointerOut = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      if (meshType === 'empty') hoveredEmptyIdRef.current = null

      // Determine restore color (Selected or Default)
      const source = meshType === 'occupied' ? occupied : empty
      const item = source[id]
      const isSelected = selectedItem?.id === item?.id
      
      const defaultColor = meshType === 'occupied' ? COLOR_OCCUPIED : COLOR_EMPTY
      const color = isSelected ? COLOR_SELECTED : defaultColor
      
      const mesh = meshType === 'occupied' ? occupiedMeshRef.current : emptyMeshRef.current
      paintInstance(mesh, id, color)
    },
    [occupied, empty, selectedItem, paintInstance],
  )

  const handleClick = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[id]
      if (!item) return

      onSelect(selectedItem?.id === item.id ? null : item)
    },
    [occupied, empty, selectedItem, onSelect],
  )

  return (
    <>
      {/* Occupied Slots */}
      <instancedMesh
        ref={occupiedMeshRef}
        args={[undefined, undefined, occupied.length]}
        onPointerOver={handlePointerOver('occupied')}
        onPointerOut={handlePointerOut('occupied')}
        onClick={handleClick('occupied')}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.6, 1, 1.2]} />
        <meshStandardMaterial 
          roughness={0.2} 
          metalness={0.1}
          color="#ffffff" // Base color is multiplied by instance color
        />
      </instancedMesh>

      {/* Empty Slots (Visible only if showEmpty is true) */}
      <group visible={showEmpty}>
        {/* Transparent Base */}
        <instancedMesh
          ref={emptyMeshRef}
          args={[undefined, undefined, empty.length]}
          onPointerOver={showEmpty ? handlePointerOver('empty') : undefined}
          onPointerOut={showEmpty ? handlePointerOut('empty') : undefined}
          onClick={showEmpty ? handleClick('empty') : undefined}
          raycast={showEmpty ? undefined : NO_RAYCAST}
          renderOrder={1} // Render after opaque
        >
          <boxGeometry args={[1.6, 1, 1.2]} />
          <meshStandardMaterial 
            transparent 
            opacity={0.1} 
            depthWrite={false} 
            color="#ffffff"
          />
        </instancedMesh>

        {/* Wireframe Rack Overlay (Non-interactive) */}
        <instancedMesh
          ref={emptyWireframeRef}
          args={[undefined, undefined, empty.length]}
          raycast={showEmpty ? undefined : NO_RAYCAST}
          renderOrder={2}
        >
          <boxGeometry args={[1.605, 1.005, 1.205]} /> 
          {/* Slightly larger to prevent Z-fighting, though depthWrite=false helps */}
          <meshBasicMaterial wireframe color="#64748b" transparent opacity={0.3} />
        </instancedMesh>
      </group>
    </>
  )
}
