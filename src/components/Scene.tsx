import { useCallback, useEffect, useRef } from 'react'
import { OrbitControls, Environment, Grid, ContactShadows, Line, Stats } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { WarehouseInstances } from './WarehouseInstances'
import { RowLabels } from './RowLabels'
import { LevelIndicators } from './LevelIndicators'
import { RackStructure } from './RackStructure'
import { AisleMarkings } from './AisleMarkings'
import type { ThemeConfig } from '../hooks/useTheme'
import type {
  CameraView,
  ContextMenuState,
  ShadowQuality,
  StatusFilter,
  VizMode,
  WarehouseData,
  WarehouseItem,
  WarehouseLayout,
} from '../types/warehouse'
import type { Dispatch, SetStateAction } from 'react'

const DEFAULT_CAMERA_VIEW: CameraView = {
  position: [30, 25, 30],
  target: [0, 4, 0],
}

interface SceneProps {
  data: WarehouseData
  layout: WarehouseLayout
  showEmpty: boolean
  statusFilter: StatusFilter
  selectedItems: WarehouseItem[]
  onSelectItems: Dispatch<SetStateAction<WarehouseItem[]>>
  searchQuery: string
  vizMode: VizMode
  shadowQuality: ShadowQuality
  onContextMenu: (state: ContextMenuState) => void
  cameraCommand: CameraView | null
  cameraCommandId: number
  initialCameraView: CameraView | null
  onCameraChange: (view: CameraView) => void
  onFirstFrame: () => void
  themeConfig: ThemeConfig
  showPerfOverlay: boolean
}

interface SceneContentProps extends SceneProps {
  initialTarget: [number, number, number]
}

function toTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z]
}

function FirstFrameNotifier({ onFirstFrame }: { onFirstFrame: () => void }) {
  const hasNotifiedRef = useRef(false)

  useFrame(() => {
    if (hasNotifiedRef.current) return
    hasNotifiedRef.current = true
    onFirstFrame()
  })

  return null
}

function SceneContent({
  data,
  layout,
  showEmpty,
  statusFilter,
  selectedItems,
  onSelectItems,
  searchQuery,
  vizMode,
  shadowQuality,
  onContextMenu,
  cameraCommand,
  cameraCommandId,
  initialTarget,
  onCameraChange,
  onFirstFrame,
  themeConfig,
  showPerfOverlay,
}: SceneContentProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const desiredPositionRef = useRef<THREE.Vector3 | null>(null)
  const desiredTargetRef = useRef<THREE.Vector3 | null>(null)

  const shadowEnabled = shadowQuality !== 'off'
  const shadowMapSize = shadowQuality === 'high' ? 2048 : 512

  const emitCameraChange = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return

    onCameraChange({
      position: toTuple(controls.object.position),
      target: toTuple(controls.target),
    })
  }, [onCameraChange])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    controls.target.set(...initialTarget)
    controls.target0.set(...initialTarget)
    controls.update()
    controls.saveState()
    emitCameraChange()
  }, [initialTarget, emitCameraChange])

  useEffect(() => {
    if (!cameraCommand) return

    desiredPositionRef.current = new THREE.Vector3(...cameraCommand.position)
    desiredTargetRef.current = new THREE.Vector3(...cameraCommand.target)
  }, [cameraCommand, cameraCommandId])

  useFrame(() => {
    const controls = controlsRef.current
    const desiredPosition = desiredPositionRef.current
    const desiredTarget = desiredTargetRef.current

    if (!controls || !desiredPosition || !desiredTarget) return

    controls.object.position.lerp(desiredPosition, 0.08)
    controls.target.lerp(desiredTarget, 0.08)
    controls.update()

    const reachedPosition = controls.object.position.distanceTo(desiredPosition) < 0.05
    const reachedTarget = controls.target.distanceTo(desiredTarget) < 0.05
    if (!reachedPosition || !reachedTarget) return

    controls.object.position.copy(desiredPosition)
    controls.target.copy(desiredTarget)
    controls.update()

    desiredPositionRef.current = null
    desiredTargetRef.current = null
    emitCameraChange()
  })

  return (
    <>
      <fog attach="fog" args={[themeConfig.fogColor, 45, 130]} />
      <Environment preset="city" />

      <directionalLight
        position={[20, 30, 10]}
        intensity={2}
        castShadow={shadowEnabled}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40]} />
      </directionalLight>

      <AisleMarkings layout={layout} color={themeConfig.aisleColor} />
      <RackStructure layout={layout} color={themeConfig.rackColor} />
      <RowLabels layout={layout} color={themeConfig.labelColor} />
      <LevelIndicators layout={layout} color={themeConfig.labelColor} />

      <Grid
        renderOrder={-1}
        position={[0, -0.01, 0]}
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        fadeDistance={70}
        sectionColor={themeConfig.gridSection}
        cellColor={themeConfig.gridCell}
      />

      {shadowEnabled && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.45}
          scale={65}
          blur={2}
          far={5}
          resolution={256}
          color="#000000"
        />
      )}

      <Line points={[[0, 0.04, 0], [5, 0.04, 0]]} color={themeConfig.axisX} lineWidth={2} />
      <Line points={[[0, 0.04, 0], [0, 0.04, 5]]} color={themeConfig.axisZ} lineWidth={2} />

      <WarehouseInstances
        occupied={data.occupied}
        empty={data.empty}
        showEmpty={showEmpty}
        statusFilter={statusFilter}
        selectedItems={selectedItems}
        onSelectItems={onSelectItems}
        searchQuery={searchQuery}
        vizMode={vizMode}
        onContextMenu={onContextMenu}
        themeConfig={themeConfig}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2.03}
        target={initialTarget}
        onEnd={emitCameraChange}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />

      <EffectComposer enableNormalPass>
        <SSAO radius={0.4} intensity={50} luminanceInfluence={0.4} />
        <Bloom luminanceThreshold={1} mipmapBlur intensity={0.5} radius={0.4} />
      </EffectComposer>

      {showPerfOverlay && <Stats className="!absolute !left-auto !right-4 !top-4" />}
      <FirstFrameNotifier onFirstFrame={onFirstFrame} />
    </>
  )
}

export function Scene({
  data,
  layout,
  showEmpty,
  statusFilter,
  selectedItems,
  onSelectItems,
  searchQuery,
  vizMode,
  shadowQuality,
  onContextMenu,
  cameraCommand,
  cameraCommandId,
  initialCameraView,
  onCameraChange,
  onFirstFrame,
  themeConfig,
  showPerfOverlay,
}: SceneProps) {
  const cameraView = initialCameraView ?? DEFAULT_CAMERA_VIEW

  return (
    <Canvas
      shadows="soft"
      camera={{ position: cameraView.position, fov: 45, near: 0.1, far: 220 }}
      style={{ width: '100vw', height: '100vh', background: themeConfig.canvasBg }}
      gl={{
        antialias: false,
        stencil: false,
        alpha: false,
        precision: 'highp',
        preserveDrawingBuffer: true,
      }}
      onPointerMissed={() => onSelectItems([])}
      onContextMenu={(event) => event.preventDefault()}
    >
      <SceneContent
        data={data}
        layout={layout}
        showEmpty={showEmpty}
        statusFilter={statusFilter}
        selectedItems={selectedItems}
        onSelectItems={onSelectItems}
        searchQuery={searchQuery}
        vizMode={vizMode}
        shadowQuality={shadowQuality}
        onContextMenu={onContextMenu}
        cameraCommand={cameraCommand}
        cameraCommandId={cameraCommandId}
        initialCameraView={initialCameraView}
        initialTarget={cameraView.target}
        onCameraChange={onCameraChange}
        onFirstFrame={onFirstFrame}
        themeConfig={themeConfig}
        showPerfOverlay={showPerfOverlay}
      />
    </Canvas>
  )
}
