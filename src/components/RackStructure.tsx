import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { WarehouseLayout } from '../types/warehouse'

interface RackStructureProps {
  layout: WarehouseLayout
  color: string
}

interface Position3D {
  x: number
  y: number
  z: number
}

export function RackStructure({ layout, color }: RackStructureProps) {
  const { posts, beamsX, beamsZ, postHeight } = useMemo(() => {
    const postsAcc: Position3D[] = []
    const beamsAlongX: Position3D[] = []
    const beamsAlongZ: Position3D[] = []

    const rowOffset = ((layout.rows - 1) * layout.rowSpacing) / 2
    const colOffset = ((layout.cols - 1) * layout.colSpacing) / 2
    const slotHalfWidth = 0.8
    const slotHalfDepth = 0.6
    const postHalfWidth = 0.06
    const postHalfDepth = 0.06
    const height = layout.levels * layout.levelHeight

    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const centerX = col * layout.colSpacing - colOffset
        const centerZ = row * layout.rowSpacing - rowOffset

        postsAcc.push(
          { x: centerX - slotHalfWidth + postHalfWidth, y: height / 2, z: centerZ - slotHalfDepth + postHalfDepth },
          { x: centerX + slotHalfWidth - postHalfWidth, y: height / 2, z: centerZ - slotHalfDepth + postHalfDepth },
          { x: centerX - slotHalfWidth + postHalfWidth, y: height / 2, z: centerZ + slotHalfDepth - postHalfDepth },
          { x: centerX + slotHalfWidth - postHalfWidth, y: height / 2, z: centerZ + slotHalfDepth - postHalfDepth },
        )
      }
    }

    for (let level = 0; level < layout.levels; level += 1) {
      const y = level * layout.levelHeight + layout.levelHeight

      for (let row = 0; row < layout.rows; row += 1) {
        const z = row * layout.rowSpacing - rowOffset
        beamsAlongX.push(
          { x: 0, y, z: z - slotHalfDepth },
          { x: 0, y, z: z + slotHalfDepth },
        )
      }

      for (let col = 0; col < layout.cols; col += 1) {
        const x = col * layout.colSpacing - colOffset
        beamsAlongZ.push(
          { x: x - slotHalfWidth, y, z: 0 },
          { x: x + slotHalfWidth, y, z: 0 },
        )
      }
    }

    return { posts: postsAcc, beamsX: beamsAlongX, beamsZ: beamsAlongZ, postHeight: height }
  }, [layout])

  return (
    <group>
      <Instances limit={posts.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.45} />
        {posts.map((post, index) => (
          <Instance
            key={`post-${index}`}
            position={[post.x, post.y, post.z]}
            scale={[0.06, postHeight, 0.06]}
          />
        ))}
      </Instances>

      <Instances limit={beamsX.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.45} />
        {beamsX.map((beam, index) => (
          <Instance
            key={`beam-x-${index}`}
            position={[beam.x, beam.y, beam.z]}
            scale={[layout.cols * layout.colSpacing + 1.5, 0.08, 0.08]}
          />
        ))}
      </Instances>

      <Instances limit={beamsZ.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.45} />
        {beamsZ.map((beam, index) => (
          <Instance
            key={`beam-z-${index}`}
            position={[beam.x, beam.y, beam.z]}
            scale={[0.08, 0.08, layout.rows * layout.rowSpacing + 1.5]}
          />
        ))}
      </Instances>
    </group>
  )
}
