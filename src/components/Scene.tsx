import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { WarehouseInstances } from './WarehouseInstances'
import { useWarehouseData } from '../hooks/useWarehouseData'

function SceneContent() {
  const { occupied, empty, items } = useWarehouseData()

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      <WarehouseInstances occupied={occupied} empty={empty} allItems={items} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [25, 20, 25], fov: 50, near: 0.1, far: 200 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <SceneContent />
    </Canvas>
  )
}
