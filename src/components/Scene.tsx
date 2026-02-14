import { useRef, useEffect } from 'react'
import { OrbitControls, Environment, Grid, ContactShadows } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing'
import { WarehouseInstances } from './WarehouseInstances'
import { useWarehouseData } from '../hooks/useWarehouseData'
import type { WarehouseItem } from '../types/warehouse'

interface SceneProps {
  showEmpty: boolean
  selectedItem: WarehouseItem | null
  onSelect: (item: WarehouseItem | null) => void
  resetCameraTrigger: number
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [30, 25, 30]
const DEFAULT_CAMERA_TARGET: [number, number, number] = [10, 0, 10]

function SceneContent({ showEmpty, selectedItem, onSelect, resetCameraTrigger }: SceneProps) {
  const { occupied, empty } = useWarehouseData()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (!controlsRef.current) return

    controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET)
    controlsRef.current.target0.set(...DEFAULT_CAMERA_TARGET)
    controlsRef.current.update()
    controlsRef.current.saveState()
  }, [])

  useEffect(() => {
    if (!controlsRef.current) return

    controlsRef.current.target0.set(...DEFAULT_CAMERA_TARGET)
    controlsRef.current.reset()
  }, [resetCameraTrigger])

  return (
    <>
      <Environment preset="city" />
      
      {/* Main Light */}
      <directionalLight
        position={[20, 30, 10]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40]} />
      </directionalLight>

      {/* Floor & Shadows */}
      <Grid
        renderOrder={-1}
        position={[0, -0.01, 0]}
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        fadeDistance={60}
        sectionColor="#4a5568"
        cellColor="#2d3748"
      />
      <ContactShadows 
        position={[0, 0, 0]} 
        opacity={0.6} 
        scale={60} 
        blur={2} 
        far={4.5} 
        resolution={256} 
        color="#000000" 
      />

      <WarehouseInstances 
        occupied={occupied} 
        empty={empty} 
        showEmpty={showEmpty}
        selectedItem={selectedItem}
        onSelect={onSelect}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.05}
        target={DEFAULT_CAMERA_TARGET}
      />

      <EffectComposer enableNormalPass>
        <SSAO 
          radius={0.4} 
          intensity={50} 
          luminanceInfluence={0.4} 
        />
        <Bloom 
          luminanceThreshold={1} 
          mipmapBlur 
          intensity={0.5} 
          radius={0.4} 
        />
      </EffectComposer>
    </>
  )
}

export function Scene(props: SceneProps) {
  return (
    <Canvas
      shadows="soft"
      camera={{ position: DEFAULT_CAMERA_POSITION, fov: 45, near: 0.1, far: 200 }}
      style={{ width: '100vw', height: '100vh', background: '#111827' }} // dark gray bg
      gl={{ antialias: false, stencil: false, alpha: false }} // Post-processing perf optimization
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
