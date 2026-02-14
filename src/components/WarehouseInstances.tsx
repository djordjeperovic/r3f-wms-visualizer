import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { WarehouseItem } from '../types/warehouse'
import { LocationTooltip } from './LocationTooltip'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

const COLOR_OCCUPIED = new THREE.Color('#e67e22')
const COLOR_EMPTY = new THREE.Color('#d5d8dc')
const COLOR_HIGHLIGHT = new THREE.Color('#f1c40f')

interface WarehouseInstancesProps {
  occupied: WarehouseItem[]
  empty: WarehouseItem[]
  allItems: WarehouseItem[]
}

type MeshType = 'occupied' | 'empty'

export function WarehouseInstances({ occupied, empty, allItems }: WarehouseInstancesProps) {
  const occupiedMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const emptyMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const [selectedItem, setSelectedItem] = useState<WarehouseItem | null>(null)

  useEffect(() => {
    if (allItems.length !== occupied.length + empty.length) {
      console.warn('Warehouse instance partition mismatch detected.')
    }
  }, [allItems.length, occupied.length, empty.length])

  useLayoutEffect(() => {
    const occupiedMesh = occupiedMeshRef.current
    const emptyMesh = emptyMeshRef.current
    if (!occupiedMesh || !emptyMesh) return

    for (let index = 0; index < occupied.length; index += 1) {
      const item = occupied[index]
      tempObject.position.set(...item.position)
      tempObject.updateMatrix()
      occupiedMesh.setMatrixAt(index, tempObject.matrix)
      tempColor.copy(COLOR_OCCUPIED)
      occupiedMesh.setColorAt(index, tempColor)
    }
    occupiedMesh.instanceMatrix.needsUpdate = true
    if (occupiedMesh.instanceColor) {
      occupiedMesh.instanceColor.needsUpdate = true
    }

    for (let index = 0; index < empty.length; index += 1) {
      const item = empty[index]
      tempObject.position.set(...item.position)
      tempObject.updateMatrix()
      emptyMesh.setMatrixAt(index, tempObject.matrix)
      tempColor.copy(COLOR_EMPTY)
      emptyMesh.setColorAt(index, tempColor)
    }
    emptyMesh.instanceMatrix.needsUpdate = true
    if (emptyMesh.instanceColor) {
      emptyMesh.instanceColor.needsUpdate = true
    }
  }, [occupied, empty])

  const getMesh = useCallback(
    (meshType: MeshType): THREE.InstancedMesh | null =>
      meshType === 'occupied' ? occupiedMeshRef.current : emptyMeshRef.current,
    [],
  )

  const paintInstance = useCallback((mesh: THREE.InstancedMesh | null, id: number, color: THREE.Color) => {
    if (!mesh) return
    tempColor.copy(color)
    mesh.setColorAt(id, tempColor)
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [])

  const handlePointerOver = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      paintInstance(getMesh(meshType), id, COLOR_HIGHLIGHT)
    },
    [getMesh, paintInstance],
  )

  const handlePointerOut = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      const originalColor = meshType === 'occupied' ? COLOR_OCCUPIED : COLOR_EMPTY
      paintInstance(getMesh(meshType), id, originalColor)
    },
    [getMesh, paintInstance],
  )

  const handleClick = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[id]
      if (!item) return

      setSelectedItem((previous) => (previous?.id === item.id ? null : item))
    },
    [occupied, empty],
  )

  return (
    <>
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
        <meshStandardMaterial />
      </instancedMesh>

      <instancedMesh
        ref={emptyMeshRef}
        args={[undefined, undefined, empty.length]}
        renderOrder={1}
        onPointerOver={handlePointerOver('empty')}
        onPointerOut={handlePointerOut('empty')}
        onClick={handleClick('empty')}
      >
        <boxGeometry args={[1.6, 1, 1.2]} />
        <meshStandardMaterial transparent opacity={0.35} depthWrite={false} />
      </instancedMesh>

      {selectedItem && <LocationTooltip item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </>
  )
}
