# Roadmap — r3f-wms-visualizer

Frontend-only improvements for the 3D Warehouse Visualization, organized by priority.
All items keep the app fully client-side with no backend dependencies.

> **Current state** (as of 2026-02-14): 550 instanced storage locations rendered at 60 FPS with hover highlight, click selection, empty-slot toggle, orbit controls, SSAO + Bloom post-processing, and a minimal overlay panel.

---

## Phase 1 — Quick Wins & Polish

Low-effort fixes and improvements that address bugs and visual gaps discovered during live testing.

### Todo

- [x] **Fix page title** — `index.html:7` still says `"scaffold-tmp"`
  ```html
  <!-- index.html -->
  <title>Warehouse Visualizer</title>
  ```
- [x] **Fix favicon 404** — browser requests `/vite.svg` which doesn't exist in production; replace with a warehouse-themed SVG or emoji favicon
  ```html
  <!-- index.html — replace the current <link rel="icon"> -->
  <link rel="icon" type="image/svg+xml"
    href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>" />
  ```
- [x] **Expand the selection panel** — currently only shows ID (`Overlay.tsx:53`); add SKU, status, and grid position
  ```tsx
  // src/components/Overlay.tsx — inside the selectedItem block
  {selectedItem && (
    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-1">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Selection
      </h2>
      <div className="text-sm text-slate-100 font-mono">ID: {selectedItem.id}</div>
      <div className="text-sm text-slate-300">
        Status:{' '}
        <span className={selectedItem.status === 'occupied' ? 'text-orange-400' : 'text-slate-500'}>
          {selectedItem.status}
        </span>
      </div>
      {selectedItem.sku && (
        <div className="text-sm text-slate-300">
          SKU: <span className="font-mono text-slate-100">{selectedItem.sku}</span>
        </div>
      )}
      <div className="text-xs text-slate-500">
        Pos: [{selectedItem.position.map(v => v.toFixed(1)).join(', ')}]
      </div>
    </div>
  )}
  ```
- [x] **Mobile responsive overlay** — on viewports ≤ 640 px the overlay should collapse to a minimal bar with a toggle to expand
  ```tsx
  // src/components/Overlay.tsx — wrap the controls panel
  const [collapsed, setCollapsed] = useState(false)

  // Use Tailwind responsive utilities
  <div className={`pointer-events-auto bg-slate-900/80 backdrop-blur-md rounded-xl
    border border-slate-700/50 shadow-2xl transition-all
    ${collapsed ? 'p-2' : 'p-4 max-w-xs'}
    sm:p-4 sm:max-w-xs`}>
    {/* Collapse toggle visible only on small screens */}
    <button
      className="sm:hidden text-slate-400 text-xs mb-2"
      onClick={() => setCollapsed(c => !c)}
    >
      {collapsed ? '▶ Expand' : '▼ Collapse'}
    </button>
    {/* Conditionally render contents */}
    {!collapsed && (
      <>
        {/* existing title, toggle, legend, selection panel */}
      </>
    )}
  </div>
  ```
- [x] **Add a canvas loading indicator** — show a spinner/placeholder until the R3F `<Canvas>` mounts and first frame renders
  ```tsx
  // src/App.tsx — use React Suspense with a styled fallback
  import { Suspense } from 'react'

  function LoadingFallback() {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Wrap <Scene /> in Suspense
  <Suspense fallback={<LoadingFallback />}>
    <Scene ... />
  </Suspense>
  ```
- [x] **Suppress WebGL shader precision warnings** — `Scene.tsx` Canvas `gl` prop: set `precision: 'highp'` to avoid the `X4122` float precision warnings
  ```tsx
  // src/components/Scene.tsx — add precision to gl prop
  <Canvas
    gl={{ antialias: false, stencil: false, alpha: false, precision: 'highp' }}
    ...
  >
  ```
- [x] **Add meta description and Open Graph tags** for social sharing
  ```html
  <!-- index.html <head> -->
  <meta name="description" content="Interactive 3D warehouse visualization built with React Three Fiber" />
  <meta property="og:title" content="Warehouse Visualizer" />
  <meta property="og:description" content="Explore a 550-slot 3D warehouse with real-time interactions" />
  <meta property="og:type" content="website" />
  ```

---

## Phase 2 — Enhanced Interactions

Add search, multi-select, keyboard shortcuts, and camera-fly-to for a more interactive experience.

### Todo

- [x] **Add search/filter input** — add a text input to the overlay that filters items by ID or SKU prefix
  ```tsx
  // src/components/Overlay.tsx — new state + input above the legend
  const [searchQuery, setSearchQuery] = useState('')

  <input
    type="text"
    placeholder="Search ID or SKU…"
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5
      text-sm text-slate-100 placeholder-slate-500 focus:outline-none
      focus:ring-1 focus:ring-orange-500 mb-4"
  />
  ```
- [x] **Pipe search filter to App state** — lift `searchQuery` to `App.tsx` and pass to `Scene` for 3D highlighting
  ```tsx
  // src/App.tsx — new state
  const [searchQuery, setSearchQuery] = useState('')

  // Pass down
  <Scene ... searchQuery={searchQuery} />
  <Overlay ... searchQuery={searchQuery} onSearchChange={setSearchQuery} />
  ```
- [x] **Highlight matching items in the 3D scene** — in `WarehouseInstances.tsx`, dim non-matching items when a search is active
  ```tsx
  // src/components/WarehouseInstances.tsx — add a useEffect for search highlighting
  const COLOR_DIM = new THREE.Color('#555555')

  useEffect(() => {
    if (!searchQuery) {
      // Reset all to default colors
      resetAllColors()
      return
    }
    const query = searchQuery.toLowerCase()
    occupied.forEach((item, i) => {
      const matches = item.id.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query)
      paintInstance(occupiedMeshRef.current, i, matches ? COLOR_OCCUPIED : COLOR_DIM)
    })
    empty.forEach((item, i) => {
      const matches = item.id.toLowerCase().includes(query)
      paintInstance(emptyMeshRef.current, i, matches ? COLOR_EMPTY : COLOR_DIM)
    })
  }, [searchQuery, occupied, empty])
  ```
- [x] **Display search result count** — show "N matches" below the search input
  ```tsx
  // src/components/Overlay.tsx — below the input
  {searchQuery && (
    <p className="text-xs text-slate-400 mb-3">
      {matchCount} location{matchCount !== 1 ? 's' : ''} found
    </p>
  )}
  ```
- [x] **Add status filter dropdown** — filter by "All", "Occupied", or "Empty"
  ```tsx
  // src/components/Overlay.tsx — after search input
  <select
    value={statusFilter}
    onChange={e => setStatusFilter(e.target.value as 'all' | 'occupied' | 'empty')}
    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5
      text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 mb-4"
  >
    <option value="all">All Statuses</option>
    <option value="occupied">Occupied Only</option>
    <option value="empty">Empty Only</option>
  </select>
  ```
- [x] **Multi-select with Shift+Click** — change `selectedItem` from a single item to an array
  ```tsx
  // src/App.tsx — change state shape
  const [selectedItems, setSelectedItems] = useState<WarehouseItem[]>([])

  // src/components/WarehouseInstances.tsx — update click handler
  const handleClick = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      const id = event.instanceId
      if (id === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[id]
      if (!item) return

      if (event.nativeEvent.shiftKey) {
        // Toggle in multi-select
        onSelect(prev =>
          prev.some(i => i.id === item.id)
            ? prev.filter(i => i.id !== item.id)
            : [...prev, item]
        )
      } else {
        // Single select toggle
        onSelect(prev =>
          prev.length === 1 && prev[0].id === item.id ? [] : [item]
        )
      }
    },
    [occupied, empty, onSelect],
  )
  ```
- [x] **Update Overlay selection panel for multi-select** — show count and list of selected IDs
  ```tsx
  // src/components/Overlay.tsx
  {selectedItems.length > 0 && (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Selection ({selectedItems.length})
      </h2>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {selectedItems.map(item => (
          <div key={item.id} className="text-sm text-slate-100 font-mono">
            {item.id} {item.sku && `— ${item.sku}`}
          </div>
        ))}
      </div>
    </div>
  )}
  ```
- [x] **Keyboard shortcut: Escape to deselect** — add a global keydown listener
  ```tsx
  // src/App.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItems([])
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  ```
- [x] **Keyboard shortcut: `/` to focus search** — standard pattern for search focus
  ```tsx
  // src/App.tsx — inside the same keydown handler
  if (e.key === '/' && document.activeElement === document.body) {
    e.preventDefault()
    searchInputRef.current?.focus()
  }
  ```
- [x] **Camera fly-to on selection** — animate the camera to look at the selected item
  ```tsx
  // src/components/Scene.tsx — use useFrame for smooth interpolation
  import { useFrame, useThree } from '@react-three/fiber'

  function CameraAnimator({ target }: { target: [number, number, number] | null }) {
    const { camera } = useThree()
    const controlsRef = useRef<any>(null)

    useFrame(() => {
      if (!target || !controlsRef.current) return
      // Lerp the controls target toward the selected position
      controlsRef.current.target.lerp(
        new THREE.Vector3(...target), 0.05
      )
      controlsRef.current.update()
    })

    return null
  }
  ```
- [x] **Deselect on empty canvas click** — clicking on the floor or empty space clears selection
  ```tsx
  // src/components/Scene.tsx — add onPointerMissed to Canvas
  <Canvas
    onPointerMissed={() => onSelect([])}
    ...
  >
  ```
- [x] **Right-click context menu** — show a small popup on right-click with actions like "Copy ID", "Focus Camera"
  ```tsx
  // New component: src/components/ContextMenu.tsx
  interface ContextMenuProps {
    position: { x: number; y: number }
    item: WarehouseItem
    onClose: () => void
    onCopyId: () => void
    onFocusCamera: () => void
  }

  export function ContextMenu({ position, item, onClose, onCopyId, onFocusCamera }: ContextMenuProps) {
    return (
      <div
        className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-50"
        style={{ left: position.x, top: position.y }}
      >
        <button onClick={onCopyId} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
          Copy ID ({item.id})
        </button>
        <button onClick={onFocusCamera} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
          Focus Camera
        </button>
        {item.sku && (
          <button onClick={() => navigator.clipboard.writeText(item.sku!)} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
            Copy SKU ({item.sku})
          </button>
        )}
      </div>
    )
  }
  ```
- [x] **Add `onContextMenu` handler to WarehouseInstances** — capture right-click events on instances
  ```tsx
  // src/components/WarehouseInstances.tsx
  const handleContextMenu = useCallback(
    (meshType: MeshType) => (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      event.nativeEvent.preventDefault()
      const id = event.instanceId
      if (id === undefined) return

      const source = meshType === 'occupied' ? occupied : empty
      const item = source[id]
      if (!item) return

      onContextMenu({
        item,
        position: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
      })
    },
    [occupied, empty, onContextMenu],
  )
  ```

---

## Phase 3 — Scene Enhancements

Visual improvements to the 3D scene for better orientation and realism.

### Todo

- [x] **Add 3D row labels** — render text labels at the start of each rack row using drei `<Text>`
  ```tsx
  // New component: src/components/RowLabels.tsx
  import { Text } from '@react-three/drei'

  const ROW_SPACING = 4
  const ROWS = 10
  const COL_OFFSET = -((11 - 1) * 2) / 2

  export function RowLabels() {
    const rowCenterOffset = ((ROWS - 1) * ROW_SPACING) / 2

    return (
      <>
        {Array.from({ length: ROWS }, (_, row) => (
          <Text
            key={row}
            position={[COL_OFFSET - 2, 0.5, row * ROW_SPACING - rowCenterOffset]}
            fontSize={0.6}
            color="#94a3b8"
            anchorX="right"
            anchorY="middle"
          >
            {`Row ${row + 1}`}
          </Text>
        ))}
      </>
    )
  }
  ```
- [x] **Add column labels** — render column numbers along the front of the warehouse
  ```tsx
  // src/components/RowLabels.tsx — add column labels
  const COL_SPACING = 2
  const COLS = 11
  const rowOffset = -((ROWS - 1) * ROW_SPACING) / 2

  {Array.from({ length: COLS }, (_, col) => (
    <Text
      key={`col-${col}`}
      position={[col * COL_SPACING - colCenterOffset, 0.5, rowOffset - 2]}
      fontSize={0.5}
      color="#64748b"
      anchorX="center"
      anchorY="middle"
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {`C${col + 1}`}
    </Text>
  ))}
  ```
- [x] **Add level indicators** — subtle horizontal lines at each shelf level
  ```tsx
  // src/components/LevelIndicators.tsx
  import { Line } from '@react-three/drei'

  const LEVEL_HEIGHT = 1.5
  const LEVEL_OFFSET = 0.75
  const LEVELS = 5

  export function LevelIndicators() {
    return (
      <>
        {Array.from({ length: LEVELS }, (_, level) => {
          const y = level * LEVEL_HEIGHT + LEVEL_OFFSET
          return (
            <Line
              key={level}
              points={[[-15, y, -25], [-15, y, 25]]}
              color="#334155"
              lineWidth={0.5}
              transparent
              opacity={0.4}
            />
          )
        })}
      </>
    )
  }
  ```
- [x] **Camera preset buttons** — add buttons for common views (Top, Front, Side, Isometric)
  ```tsx
  // src/components/Overlay.tsx — add a camera presets bar near the reset button
  const CAMERA_PRESETS = [
    { label: 'Top', position: [0, 50, 0] as const, target: [0, 0, 0] as const },
    { label: 'Front', position: [0, 10, 40] as const, target: [0, 4, 0] as const },
    { label: 'Side', position: [40, 10, 0] as const, target: [0, 4, 0] as const },
    { label: 'ISO', position: [30, 25, 30] as const, target: [0, 4, 0] as const },
  ] as const

  <div className="flex gap-2 mb-2">
    {CAMERA_PRESETS.map(preset => (
      <button
        key={preset.label}
        onClick={() => onCameraPreset(preset.position, preset.target)}
        className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-300"
      >
        {preset.label}
      </button>
    ))}
  </div>
  ```
- [x] **Animate camera transitions** — smoothly interpolate between camera positions using `useFrame`
  ```tsx
  // src/components/CameraAnimator.tsx
  import { useFrame, useThree } from '@react-three/fiber'
  import * as THREE from 'three'

  interface CameraAnimatorProps {
    targetPosition: THREE.Vector3 | null
    targetLookAt: THREE.Vector3 | null
    speed?: number
  }

  export function CameraAnimator({ targetPosition, targetLookAt, speed = 0.03 }: CameraAnimatorProps) {
    const { camera } = useThree()

    useFrame(() => {
      if (targetPosition) {
        camera.position.lerp(targetPosition, speed)
      }
      if (targetLookAt) {
        // Lerp the controls target, not camera.lookAt directly
        // (handled via ref to OrbitControls)
      }
    })

    return null
  }
  ```
- [x] **Rack frame geometry** — add vertical posts and horizontal beams to create a realistic racking structure
  ```tsx
  // New component: src/components/RackStructure.tsx
  // Use drei <Instances> for performance with many small cylinders
  import { Instances, Instance } from '@react-three/drei'

  export function RackStructure({ rows, cols, levels }: LayoutConfig) {
    // Vertical posts at corners of each rack bay
    // Horizontal beams connecting posts at each level
    return (
      <Instances limit={rows * cols * 2}>
        <cylinderGeometry args={[0.05, 0.05, levels * 1.5 + 0.75]} />
        <meshStandardMaterial color="#4a5568" metalness={0.6} roughness={0.3} />
        {/* ... Instance positions at rack corners */}
      </Instances>
    )
  }
  ```
- [x] **Aisle floor markings** — colored stripes on the ground between rack rows
  ```tsx
  // src/components/AisleMarkings.tsx
  export function AisleMarkings() {
    return (
      <>
        {Array.from({ length: ROWS - 1 }, (_, i) => {
          const z = (i + 0.5) * ROW_SPACING - rowCenterOffset
          return (
            <mesh key={i} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[COLS * COL_SPACING, 0.3]} />
              <meshBasicMaterial color="#eab308" transparent opacity={0.15} />
            </mesh>
          )
        })}
      </>
    )
  }
  ```
- [x] **Minimap / overhead view** — render a small 2D top-down view in a corner overlay
  ```tsx
  // Approach: use a second <Canvas> with orthographic camera showing a top-down
  // simplified view, or use a View from @react-three/drei for a picture-in-picture.
  import { View } from '@react-three/drei'

  // In the overlay:
  <div className="w-32 h-32 border border-slate-600 rounded overflow-hidden">
    <View className="w-full h-full">
      <orthographicCamera position={[0, 50, 0]} zoom={2} />
      {/* Simplified warehouse rectangles */}
    </View>
  </div>
  ```
- [x] **Hover tooltip in 3D** — show a floating label near the hovered item using drei `<Html>`
  ```tsx
  // src/components/WarehouseInstances.tsx — add a hoveredItem state and Html tooltip
  {hoveredItem && (
    <Html position={hoveredItem.position} center distanceFactor={20}
      style={{ pointerEvents: 'none' }}>
      <div className="bg-slate-900/90 text-slate-200 text-xs px-2 py-1 rounded whitespace-nowrap">
        {hoveredItem.id} {hoveredItem.sku ? `• ${hoveredItem.sku}` : ''}
      </div>
    </Html>
  )}
  ```
- [x] **Grid axis indicators** — add X/Z axis arrows at the origin for spatial orientation
  ```tsx
  // Use drei <Line> to draw axis arrows
  <Line points={[[0, 0.05, 0], [5, 0.05, 0]]} color="#ef4444" lineWidth={2} />
  <Line points={[[0, 0.05, 0], [0, 0.05, 5]]} color="#3b82f6" lineWidth={2} />
  ```
- [x] **Fog / depth cue** — add a subtle fog to improve depth perception for large warehouses
  ```tsx
  // src/components/Scene.tsx — inside SceneContent
  <fog attach="fog" args={['#111827', 40, 100]} />
  ```
- [x] **Shadow quality toggle** — allow users to toggle between high/low shadow quality for performance
  ```tsx
  // src/components/Overlay.tsx — add a performance toggle
  <div className="flex items-center justify-between">
    <label className="text-sm text-slate-300">Shadow Quality</label>
    <select value={shadowQuality} onChange={e => setShadowQuality(e.target.value)}
      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300">
      <option value="high">High (2048)</option>
      <option value="low">Low (512)</option>
      <option value="off">Off</option>
    </select>
  </div>
  ```

---

## Phase 4 — Data & Analytics

Add statistics, visualization modes, and data import/export capabilities.

### Todo

- [x] **Add a stats summary bar** — show key metrics in the overlay
  ```tsx
  // src/components/StatsPanel.tsx
  interface StatsPanelProps {
    data: WarehouseData
  }

  export function StatsPanel({ data }: StatsPanelProps) {
    const occupancyPct = ((data.occupied.length / data.items.length) * 100).toFixed(1)

    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-slate-100">{data.items.length}</div>
          <div className="text-xs text-slate-400">Total</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-400">{data.occupied.length}</div>
          <div className="text-xs text-slate-400">Occupied</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-slate-400">{data.empty.length}</div>
          <div className="text-xs text-slate-400">Empty</div>
        </div>
        <div className="col-span-3">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 text-center mt-1">{occupancyPct}% Occupancy</div>
        </div>
      </div>
    )
  }
  ```
- [x] **Per-row occupancy breakdown** — expandable section showing occupancy per row
  ```tsx
  // src/components/StatsPanel.tsx — add row breakdown
  const rowStats = useMemo(() => {
    const stats = new Map<number, { occupied: number; total: number }>()
    data.items.forEach(item => {
      const row = parseInt(item.id.split('-')[0].slice(1))
      const entry = stats.get(row) || { occupied: 0, total: 0 }
      entry.total++
      if (item.status === 'occupied') entry.occupied++
      stats.set(row, entry)
    })
    return stats
  }, [data.items])

  // Render as horizontal bar chart
  {Array.from(rowStats.entries()).map(([row, stat]) => (
    <div key={row} className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-8">R{row}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
        <div
          className="bg-orange-500 h-1.5 rounded-full"
          style={{ width: `${(stat.occupied / stat.total) * 100}%` }}
        />
      </div>
      <span className="text-slate-500 w-12 text-right">{stat.occupied}/{stat.total}</span>
    </div>
  ))}
  ```
- [x] **Heatmap visualization mode** — color items by occupancy density in their row/column neighborhood
  ```tsx
  // src/components/WarehouseInstances.tsx — add heatmap mode
  // Extend WarehouseItem or compute density on the fly

  const COLOR_HEATMAP_LOW = new THREE.Color('#22c55e')   // Green — sparse
  const COLOR_HEATMAP_MID = new THREE.Color('#eab308')   // Yellow — medium
  const COLOR_HEATMAP_HIGH = new THREE.Color('#ef4444')   // Red — dense

  function getHeatmapColor(density: number): THREE.Color {
    // density is 0–1; lerp between low → mid → high
    if (density < 0.5) {
      return new THREE.Color().lerpColors(COLOR_HEATMAP_LOW, COLOR_HEATMAP_MID, density * 2)
    }
    return new THREE.Color().lerpColors(COLOR_HEATMAP_MID, COLOR_HEATMAP_HIGH, (density - 0.5) * 2)
  }
  ```
- [x] **Add visualization mode toggle** — switch between "Status" (current) and "Heatmap" color modes
  ```tsx
  // src/App.tsx — new state
  type VizMode = 'status' | 'heatmap'
  const [vizMode, setVizMode] = useState<VizMode>('status')

  // src/components/Overlay.tsx — mode toggle buttons
  <div className="flex gap-1 mb-4">
    {(['status', 'heatmap'] as const).map(mode => (
      <button
        key={mode}
        onClick={() => setVizMode(mode)}
        className={`flex-1 px-2 py-1 text-xs rounded border transition-colors
          ${vizMode === mode
            ? 'bg-orange-500 border-orange-500 text-white'
            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
      >
        {mode.charAt(0).toUpperCase() + mode.slice(1)}
      </button>
    ))}
  </div>
  ```
- [x] **JSON data import** — allow users to upload a JSON file with warehouse items instead of using generated data
  ```tsx
  // src/components/Overlay.tsx — file upload button
  <label className="cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition-colors">
    Import JSON
    <input
      type="file"
      accept=".json"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        const items: WarehouseItem[] = JSON.parse(text)
        onImportData(items)
      }}
    />
  </label>
  ```
- [x] **Validate imported JSON schema** — check that uploaded data matches `WarehouseItem[]` shape
  ```tsx
  // src/utils/validateWarehouseData.ts
  export function validateWarehouseItems(data: unknown): data is WarehouseItem[] {
    if (!Array.isArray(data)) return false
    return data.every(item =>
      typeof item.id === 'string' &&
      Array.isArray(item.position) &&
      item.position.length === 3 &&
      item.position.every((v: unknown) => typeof v === 'number') &&
      (item.status === 'occupied' || item.status === 'empty')
    )
  }
  ```
- [x] **Configurable layout dimensions** — let users adjust rows, columns, levels, and spacing via UI sliders
  ```tsx
  // src/components/LayoutConfig.tsx
  interface LayoutConfigProps {
    config: { rows: number; cols: number; levels: number; spacing: number }
    onChange: (config: LayoutConfigProps['config']) => void
  }

  export function LayoutConfig({ config, onChange }: LayoutConfigProps) {
    return (
      <div className="space-y-2">
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <label className="text-xs text-slate-400 w-14 capitalize">{key}</label>
            <input
              type="range"
              min={key === 'spacing' ? 1 : 2}
              max={key === 'spacing' ? 8 : key === 'levels' ? 10 : 20}
              value={value}
              onChange={e => onChange({ ...config, [key]: Number(e.target.value) })}
              className="flex-1 accent-orange-500"
            />
            <span className="text-xs text-slate-300 w-6 text-right">{value}</span>
          </div>
        ))}
      </div>
    )
  }
  ```
- [x] **Parameterize `generateWarehouseData`** — accept layout config instead of hardcoded constants
  ```tsx
  // src/data/generateWarehouseData.ts — accept optional config
  export interface WarehouseLayout {
    rows: number
    cols: number
    levels: number
    rowSpacing: number
    colSpacing: number
    levelHeight: number
  }

  const DEFAULT_LAYOUT: WarehouseLayout = {
    rows: 10, cols: 11, levels: 5,
    rowSpacing: 4, colSpacing: 2, levelHeight: 1.5,
  }

  export function generateWarehouseData(layout: WarehouseLayout = DEFAULT_LAYOUT): WarehouseItem[] {
    // Use layout.rows instead of ROWS, etc.
  }
  ```
- [x] **LocalStorage persistence** — save user preferences (showEmpty, vizMode, layout) to localStorage
  ```tsx
  // src/hooks/usePersistedState.ts
  export function usePersistedState<T>(key: string, defaultValue: T) {
    const [value, setValue] = useState<T>(() => {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    })

    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(value))
    }, [key, value])

    return [value, setValue] as const
  }
  ```
- [x] **Export scene as PNG** — capture the current canvas view and download as an image
  ```tsx
  // src/components/Overlay.tsx — export button
  const handleExportPng = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'warehouse-snapshot.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  <button onClick={handleExportPng}
    className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
    Export PNG
  </button>
  ```
  > **Note:** requires `preserveDrawingBuffer: true` in `<Canvas gl={...}>` — add it to `Scene.tsx`
- [x] **Data table view** — toggle an overlay table showing all items in a scrollable list
  ```tsx
  // src/components/DataTable.tsx
  interface DataTableProps {
    items: WarehouseItem[]
    onSelectItem: (item: WarehouseItem) => void
  }

  export function DataTable({ items, onSelectItem }: DataTableProps) {
    return (
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-slate-900/95 backdrop-blur-md
        border-t border-slate-700 overflow-y-auto">
        <table className="w-full text-sm text-slate-300">
          <thead className="sticky top-0 bg-slate-800 text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-left">Position</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}
                onClick={() => onSelectItem(item)}
                className="hover:bg-slate-800 cursor-pointer border-b border-slate-800">
                <td className="px-4 py-2 font-mono">{item.id}</td>
                <td className="px-4 py-2">
                  <span className={item.status === 'occupied' ? 'text-orange-400' : 'text-slate-500'}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono">{item.sku ?? '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  [{item.position.map(v => v.toFixed(1)).join(', ')}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  ```
- [x] **Add table toggle button to overlay** — show/hide the data table
  ```tsx
  // src/components/Overlay.tsx
  <button
    onClick={() => setShowTable(t => !t)}
    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
  >
    {showTable ? 'Hide Table' : 'Show Table'}
  </button>
  ```

---

## Phase 5 — Advanced Features

Polish and power-user features for a production-grade experience.

### Todo

- [x] **Light/dark theme toggle** — switch between dark (current) and light theme
  ```tsx
  // src/hooks/useTheme.ts
  type Theme = 'dark' | 'light'

  const THEME_CONFIG = {
    dark: {
      canvasBg: '#111827',
      overlayBg: 'bg-slate-900/80',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-400',
      gridSection: '#4a5568',
      gridCell: '#2d3748',
    },
    light: {
      canvasBg: '#f1f5f9',
      overlayBg: 'bg-white/80',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-600',
      gridSection: '#cbd5e1',
      gridCell: '#e2e8f0',
    },
  } as const

  export function useTheme() {
    const [theme, setTheme] = usePersistedState<Theme>('wms-theme', 'dark')
    return { theme, setTheme, config: THEME_CONFIG[theme] }
  }
  ```
- [x] **Pass theme config through to Scene and Overlay** — update colors dynamically
  ```tsx
  // src/components/Scene.tsx — use theme config
  <Canvas style={{ background: themeConfig.canvasBg }} ...>
  <Grid sectionColor={themeConfig.gridSection} cellColor={themeConfig.gridCell} ... />
  ```
- [x] **Theme toggle button in overlay**
  ```tsx
  // src/components/Overlay.tsx
  <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs">
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>
  ```
- [x] **Accessibility: ARIA labels** — add proper roles and labels to all interactive overlay elements
  ```tsx
  // src/components/Overlay.tsx — add ARIA attributes
  <button
    role="switch"
    aria-checked={showEmpty}
    aria-label="Toggle empty slot visibility"
    onClick={() => setShowEmpty(!showEmpty)}
    ...
  >
  ```
- [x] **Accessibility: keyboard-only overlay navigation** — ensure all overlay controls are focusable and operable with Tab/Enter
  ```tsx
  // Ensure all interactive elements have proper tabIndex and key handlers
  <button tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleClick()} ...>
  ```
- [x] **Accessibility: screen reader announcements** — use aria-live regions for selection changes
  ```tsx
  // src/App.tsx — add a live region
  <div aria-live="polite" className="sr-only">
    {selectedItems.length > 0
      ? `Selected ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}: ${selectedItems.map(i => i.id).join(', ')}`
      : 'No items selected'}
  </div>
  ```
- [x] **Performance overlay** — optional FPS counter and draw call count for debugging
  ```tsx
  // src/components/PerfOverlay.tsx
  import { useFrame, useThree } from '@react-three/fiber'

  export function PerfOverlay() {
    const { gl } = useThree()
    const [fps, setFps] = useState(0)

    useFrame((_, delta) => {
      setFps(Math.round(1 / delta))
    })

    return (
      <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div className="fixed top-4 right-4 bg-black/70 text-green-400 font-mono text-xs px-2 py-1 rounded">
          {fps} FPS | {gl.info.render.calls} draws | {gl.info.render.triangles} tris
        </div>
      </Html>
    )
  }
  ```
  > **Alternative:** use the `<Stats />` component from drei for a quick drop-in FPS counter:
  > ```tsx
  > import { Stats } from '@react-three/drei'
  > <Stats className="!absolute !left-auto !right-4 !top-4" />
  > ```
- [x] **Shareable URL state** — encode camera position, filters, and selections in URL query params
  ```tsx
  // src/hooks/useUrlState.ts
  export function useUrlState() {
    const updateUrl = useCallback((params: Record<string, string>) => {
      const url = new URL(window.location.href)
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
      window.history.replaceState({}, '', url.toString())
    }, [])

    const getParam = useCallback((key: string) => {
      return new URL(window.location.href).searchParams.get(key)
    }, [])

    return { updateUrl, getParam }
  }

  // Usage in App.tsx:
  // On selection change → updateUrl({ selected: item.id })
  // On mount → read selected from URL and restore state
  ```
- [x] **Touch gesture support** — improve mobile experience with pinch-to-zoom and swipe gestures
  ```tsx
  // OrbitControls already supports touch via Three.js, but we can improve:
  // src/components/Scene.tsx — ensure touch is enabled
  <OrbitControls
    enableDamping
    touches={{
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    }}
    ...
  />
  ```
- [x] **Guided tour / onboarding** — show a step-by-step walkthrough for first-time users
  ```tsx
  // src/components/GuidedTour.tsx
  const TOUR_STEPS = [
    { target: 'legend', content: 'Orange boxes are occupied, transparent ones are empty.' },
    { target: 'toggle', content: 'Toggle empty slots on/off here.' },
    { target: 'canvas', content: 'Left-click to rotate, right-click to pan, scroll to zoom.' },
    { target: 'item', content: 'Click any box to see its details.' },
  ]

  export function GuidedTour({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0)

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-slate-800 rounded-xl p-6 max-w-sm border border-slate-600 shadow-2xl">
          <p className="text-sm text-slate-200 mb-4">{TOUR_STEPS[step].content}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{step + 1} / {TOUR_STEPS.length}</span>
            <button
              onClick={() => step < TOUR_STEPS.length - 1 ? setStep(s => s + 1) : onComplete()}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg"
            >
              {step < TOUR_STEPS.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```
- [x] **Show tour on first visit only** — check localStorage flag
  ```tsx
  // src/App.tsx
  const [showTour, setShowTour] = useState(() => !localStorage.getItem('wms-tour-complete'))

  const handleTourComplete = () => {
    localStorage.setItem('wms-tour-complete', 'true')
    setShowTour(false)
  }

  {showTour && <GuidedTour onComplete={handleTourComplete} />}
  ```
- [x] **Undo/redo for view state** — track camera and selection history
  ```tsx
  // src/hooks/useUndoRedo.ts
  interface HistoryEntry {
    selectedItems: WarehouseItem[]
    cameraPosition?: [number, number, number]
  }

  export function useUndoRedo(maxHistory = 50) {
    const [past, setPast] = useState<HistoryEntry[]>([])
    const [future, setFuture] = useState<HistoryEntry[]>([])

    const push = useCallback((entry: HistoryEntry) => {
      setPast(p => [...p.slice(-maxHistory), entry])
      setFuture([])
    }, [maxHistory])

    const undo = useCallback(() => {
      setPast(p => {
        if (p.length === 0) return p
        const prev = p[p.length - 1]
        setFuture(f => [prev, ...f])
        return p.slice(0, -1)
      })
    }, [])

    const redo = useCallback(() => {
      setFuture(f => {
        if (f.length === 0) return f
        const next = f[0]
        setPast(p => [...p, next])
        return f.slice(1)
      })
    }, [])

    return { push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 }
  }
  ```

