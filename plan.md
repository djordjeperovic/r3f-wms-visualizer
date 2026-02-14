# 3D Warehouse Visualization — Implementation Plan

## Context

Build a greenfield high-performance 3D warehouse visualization from an empty project directory. The app renders 550+ storage locations as instanced boxes organized into rack rows, bays, and shelf levels. Users can orbit the scene, hover to highlight locations, and click to see details. The entire rendering must stay at 60 FPS using `InstancedMesh` (not individual mesh components).

---

## 1. Project Scaffolding

```bash
cd D:/repos/r3f-wms-visualizer
npm create vite@latest . -- --template react-ts
npm install
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
npm install tailwindcss @tailwindcss/vite
```

**`vite.config.ts`** — add Tailwind v4 Vite plugin:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**`src/index.css`** — replace contents with:

```css
@import "tailwindcss";
```

Remove `src/App.css` and default Vite logo assets.

---

## 2. File Structure

```
src/
├── main.tsx                         # ReactDOM root mount
├── index.css                        # Tailwind import
├── App.tsx                          # Canvas + UI legend overlay
├── types/
│   └── warehouse.ts                 # WarehouseItem type
├── data/
│   └── generateWarehouseData.ts     # Pure function → 550 items
├── components/
│   ├── Scene.tsx                    # Lights, floor, controls, mounts WarehouseInstances
│   ├── WarehouseInstances.tsx       # Two InstancedMesh groups + raycasting
│   └── LocationTooltip.tsx          # drei <Html> tooltip
└── hooks/
    └── useWarehouseData.ts          # useMemo wrapper, partitions occupied/empty
```

---

## 3. Data Model

### Types (`src/types/warehouse.ts`)

```ts
export interface WarehouseItem {
  id: string;
  position: [number, number, number];
  status: 'occupied' | 'empty';
  sku?: string;
}

export interface WarehouseData {
  items: WarehouseItem[];
  occupied: WarehouseItem[];
  empty: WarehouseItem[];
}
```

### Generator (`src/data/generateWarehouseData.ts`)

Layout parameters:
- **10 rows** along Z axis, 4-unit spacing (aisle width)
- **11 columns** along X axis, 2-unit spacing (bay width)
- **5 levels** along Y axis, 1.5-unit spacing, first shelf at y=0.75
- Total: 10 x 11 x 5 = **550 items**
- ~70% occupancy (`Math.random() > 0.3`)
- Positions centered at world origin for natural orbit controls
- IDs formatted as `R{row}-C{col}-L{level}`
- SKUs generated as `{letter}-{5digits}` for occupied slots

```ts
import { WarehouseItem } from '../types/warehouse';

const ROWS = 10;
const COLS = 11;
const LEVELS = 5;

const ROW_SPACING = 4;     // Z gap between rows (aisle width)
const COL_SPACING = 2;     // X gap between bays
const LEVEL_HEIGHT = 1.5;  // Y gap between shelf levels
const LEVEL_OFFSET = 0.75; // Y offset for first shelf

function generateSku(): string {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(Math.random() * 90000 + 10000);
  return `${prefix}-${num}`;
}

export function generateWarehouseData(): WarehouseItem[] {
  const items: WarehouseItem[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (let level = 0; level < LEVELS; level++) {
        const isOccupied = Math.random() > 0.3;
        const x = col * COL_SPACING - (COLS * COL_SPACING) / 2;
        const y = level * LEVEL_HEIGHT + LEVEL_OFFSET;
        const z = row * ROW_SPACING - (ROWS * ROW_SPACING) / 2;

        items.push({
          id: `R${row + 1}-C${col + 1}-L${level + 1}`,
          position: [x, y, z],
          status: isOccupied ? 'occupied' : 'empty',
          sku: isOccupied ? generateSku() : undefined,
        });
      }
    }
  }

  return items;
}
```

### Hook (`src/hooks/useWarehouseData.ts`)

```ts
import { useMemo } from 'react';
import { generateWarehouseData } from '../data/generateWarehouseData';
import { WarehouseData } from '../types/warehouse';

export function useWarehouseData(): WarehouseData {
  return useMemo(() => {
    const items = generateWarehouseData();
    return {
      items,
      occupied: items.filter((item) => item.status === 'occupied'),
      empty: items.filter((item) => item.status === 'empty'),
    };
  }, []);
}
```

---

## 4. InstancedMesh Strategy — Two Mesh Groups

### Key Decision: TWO separate `<instancedMesh>` elements, not one.

| Mesh | Count (~) | Material | Why separate |
|------|-----------|----------|-------------|
| Occupied | ~385 | `meshStandardMaterial` (opaque) | Default rendering, orange via instanceColor |
| Empty | ~165 | `meshStandardMaterial` transparent, opacity=0.35, depthWrite=false | Transparency requires different material settings |

**Rationale:** Per-instance opacity would require a custom `ShaderMaterial` with an `InstancedBufferAttribute` for opacity, plus GLSL modifications. This adds complexity disproportionate to the benefit. A single `MeshStandardMaterial` shares one `transparent` flag — you can't have some instances opaque and others transparent. Two draw calls is negligible vs 550 individual `<mesh>` components.

### Per-instance setup (`useLayoutEffect`)

- Reuse a single `THREE.Object3D` temp object at module scope (avoids GC pressure)
- Loop each array, call `setMatrixAt(i, ...)` and `setColorAt(i, color)`
- Flag `instanceMatrix.needsUpdate` and `instanceColor.needsUpdate`
- `useLayoutEffect` (not `useEffect`) ensures transforms are set before the first paint

### Geometry

`<boxGeometry args={[1.6, 1, 1.2]} />` — pallet-width proportions for realistic racking.

### Transparent mesh settings

```tsx
<meshStandardMaterial transparent opacity={0.35} depthWrite={false} />
```

`renderOrder={1}` on the transparent `<instancedMesh>` ensures it draws after the opaque mesh. `depthWrite={false}` prevents transparent surfaces from writing to the depth buffer (which would clip opaque objects behind them).

### Core Component (`src/components/WarehouseInstances.tsx`)

```tsx
import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { WarehouseItem } from '../types/warehouse';
import { LocationTooltip } from './LocationTooltip';

// Module-scope temp objects — allocated once, reused across all instances
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

// Color constants
const COLOR_OCCUPIED = new THREE.Color('#e67e22');  // Orange
const COLOR_EMPTY = new THREE.Color('#d5d8dc');     // Light grey
const COLOR_HIGHLIGHT = new THREE.Color('#f1c40f'); // Yellow/gold

interface WarehouseInstancesProps {
  occupied: WarehouseItem[];
  empty: WarehouseItem[];
  allItems: WarehouseItem[];
}

export function WarehouseInstances({ occupied, empty, allItems }: WarehouseInstancesProps) {
  const occupiedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const emptyMeshRef = useRef<THREE.InstancedMesh>(null!);

  const [hoveredInfo, setHoveredInfo] = useState<{
    meshType: 'occupied' | 'empty';
    instanceId: number;
  } | null>(null);

  const [selectedItem, setSelectedItem] = useState<WarehouseItem | null>(null);

  // --- Set instance transforms and colors before first paint ---
  useLayoutEffect(() => {
    occupied.forEach((item, i) => {
      tempObject.position.set(...item.position);
      tempObject.updateMatrix();
      occupiedMeshRef.current.setMatrixAt(i, tempObject.matrix);
      occupiedMeshRef.current.setColorAt(i, COLOR_OCCUPIED);
    });
    occupiedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (occupiedMeshRef.current.instanceColor)
      occupiedMeshRef.current.instanceColor.needsUpdate = true;

    empty.forEach((item, i) => {
      tempObject.position.set(...item.position);
      tempObject.updateMatrix();
      emptyMeshRef.current.setMatrixAt(i, tempObject.matrix);
      emptyMeshRef.current.setColorAt(i, COLOR_EMPTY);
    });
    emptyMeshRef.current.instanceMatrix.needsUpdate = true;
    if (emptyMeshRef.current.instanceColor)
      emptyMeshRef.current.instanceColor.needsUpdate = true;
  }, [occupied, empty]);

  // --- Hover handlers (direct GPU buffer mutation, no React re-render) ---
  const handlePointerOver = useCallback(
    (meshType: 'occupied' | 'empty') => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id === undefined) return;

      setHoveredInfo({ meshType, instanceId: id });

      const meshRef = meshType === 'occupied' ? occupiedMeshRef : emptyMeshRef;
      meshRef.current.setColorAt(id, COLOR_HIGHLIGHT);
      meshRef.current.instanceColor!.needsUpdate = true;
    },
    [],
  );

  const handlePointerOut = useCallback(
    (meshType: 'occupied' | 'empty') => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id === undefined) return;

      setHoveredInfo(null);

      const meshRef = meshType === 'occupied' ? occupiedMeshRef : emptyMeshRef;
      const originalColor = meshType === 'occupied' ? COLOR_OCCUPIED : COLOR_EMPTY;
      meshRef.current.setColorAt(id, originalColor);
      meshRef.current.instanceColor!.needsUpdate = true;
    },
    [],
  );

  // --- Click handler (triggers React state for tooltip) ---
  const handleClick = useCallback(
    (meshType: 'occupied' | 'empty') => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id === undefined) return;

      const items = meshType === 'occupied' ? occupied : empty;
      const item = items[id];
      setSelectedItem((prev) => (prev?.id === item.id ? null : item));
    },
    [occupied, empty],
  );

  return (
    <>
      {/* Opaque occupied instances */}
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

      {/* Transparent empty instances */}
      <instancedMesh
        ref={emptyMeshRef}
        args={[undefined, undefined, empty.length]}
        renderOrder={1}
        onPointerOver={handlePointerOver('empty')}
        onPointerOut={handlePointerOut('empty')}
        onClick={handleClick('empty')}
      >
        <boxGeometry args={[1.6, 1, 1.2]} />
        <meshStandardMaterial
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Tooltip */}
      {selectedItem && (
        <LocationTooltip item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}
```

---

## 5. Raycasting & Hover Highlight

### How R3F handles instanceId

React-three-fiber provides automatic raycasting for `<instancedMesh>`. The event object (`ThreeEvent`) includes an `instanceId` property (`number | undefined`) — the index into the instance arrays, directly corresponding to `setMatrixAt(i, ...)` and `setColorAt(i, ...)`.

Key behavior:
- `e.instanceId` returns the index of the specific instance the ray hit
- `e.stopPropagation()` prevents the event from bubbling to instances behind the hit one
- `onPointerOver` fires when cursor enters an instance; `onPointerOut` when it leaves
- R3F handles per-instance bounding box computation internally

### Hover highlight approach: direct color buffer mutation

```ts
// On hover enter:
meshRef.current.setColorAt(instanceId, COLOR_HIGHLIGHT);
meshRef.current.instanceColor!.needsUpdate = true;

// On hover leave:
meshRef.current.setColorAt(instanceId, originalColor);
meshRef.current.instanceColor!.needsUpdate = true;
```

This is a GPU buffer update, **not** a React state change. No re-render occurs. Extremely fast.

**Why not emissive?** Per-instance emissive would require a custom shader — `MeshStandardMaterial` doesn't support per-instance emissive out of the box.

**Why not a separate highlight mesh?** Would require reading back the instance matrix, positioning a standalone mesh, and managing its lifecycle. More complex for no visual benefit.

### Edge case: rapid hover between instances

When the cursor moves quickly from instance A to B, R3F fires `onPointerOut` for A then `onPointerOver` for B. The handler correctly restores A's color and sets B's highlight. No debouncing needed.

---

## 6. Tooltip — drei `<Html>`

### Decision: drei `<Html>` attached to instance world position

The tooltip uses drei's `<Html>` component positioned at the selected item's `[x, y, z]`. This auto-tracks the 3D position as the camera orbits, renders as real DOM (Tailwind-styleable), and requires no manual 3D-to-2D projection.

### Implementation (`src/components/LocationTooltip.tsx`)

```tsx
import { Html } from '@react-three/drei';
import { WarehouseItem } from '../types/warehouse';

interface LocationTooltipProps {
  item: WarehouseItem;
  onClose: () => void;
}

export function LocationTooltip({ item, onClose }: LocationTooltipProps) {
  return (
    <Html
      position={item.position}
      center
      distanceFactor={15}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-gray-900 text-white rounded-lg px-4 py-3 shadow-xl
                    border border-gray-700 min-w-[180px] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm">Location Details</span>
          <button
            className="text-gray-400 hover:text-white text-xs ml-4"
            onClick={onClose}
          >
            X
          </button>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-gray-400">ID:</span>{' '}
            <span className="font-mono">{item.id}</span>
          </p>
          <p>
            <span className="text-gray-400">Status:</span>{' '}
            <span
              className={
                item.status === 'occupied' ? 'text-orange-400' : 'text-gray-400'
              }
            >
              {item.status}
            </span>
          </p>
          {item.sku && (
            <p>
              <span className="text-gray-400">SKU:</span>{' '}
              <span className="font-mono">{item.sku}</span>
            </p>
          )}
        </div>
      </div>
    </Html>
  );
}
```

**`distanceFactor={15}`:** Scales the overlay relative to camera distance. Prevents it from dominating when zoomed in or vanishing when zoomed out.

**`center`:** CSS `transform: translate(-50%, -50%)` — tooltip centered on the 3D position.

**`pointerEvents: 'auto'`:** drei's `<Html>` defaults to `pointerEvents: 'none'` to avoid blocking 3D raycasting. Enabled here so the close button is clickable.

**Inner `e.stopPropagation()`:** Prevents clicks on the tooltip from propagating to the Canvas and triggering deselection.

---

## 7. Scene Setup (`src/components/Scene.tsx`)

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WarehouseInstances } from './WarehouseInstances';
import { useWarehouseData } from '../hooks/useWarehouseData';

function SceneContent() {
  const { occupied, empty, items } = useWarehouseData();

  return (
    <>
      {/* Lighting */}
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

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Warehouse */}
      <WarehouseInstances
        occupied={occupied}
        empty={empty}
        allItems={items}
      />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
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
  );
}
```

**Shadow camera bounds `[-30, 30, 30, -30]`:** Covers the warehouse footprint (centered at origin, ~25 units each direction). Shadow map 2048x2048 for crisp shadows without excessive GPU memory.

**`maxPolarAngle={Math.PI / 2.1}`:** Prevents the camera from going below the floor plane.

---

## 8. App Layout (`src/App.tsx`)

```tsx
import { Scene } from './components/Scene';

export default function App() {
  return (
    <div className="relative w-screen h-screen bg-black">
      <Scene />

      {/* UI overlay: legend */}
      <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm
                      text-white rounded-lg px-4 py-3 text-sm space-y-2
                      pointer-events-none select-none">
        <h1 className="font-bold text-base">Warehouse 3D View</h1>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gray-400/50 inline-block" />
          <span>Empty</span>
        </div>
        <p className="text-gray-400 text-xs mt-1">Click a location for details</p>
      </div>
    </div>
  );
}
```

**`pointer-events-none`** on the legend prevents it from blocking OrbitControls drag interactions on the canvas beneath.

---

## 9. Performance Notes

### Draw call budget

| Source | Draw calls |
|--------|-----------|
| Occupied InstancedMesh (~385 instances) | 1 |
| Empty InstancedMesh (~165 instances) | 1 |
| Floor plane | 1 |
| **Total** | **~3** |

This easily maintains 60 FPS. Compare to 550 individual `<mesh>` components which would produce 550 draw calls.

### Memoization strategy

1. **`useMemo` for data generation** — dataset generated once on mount, partition into occupied/empty also memoized
2. **`useCallback` for event handlers** — hover handlers have `[]` deps (only ref refs and constants), click handler deps on `[occupied, empty]` (stable from memo)
3. **No `useFrame` needed** — scene is static until interacted with

### Avoiding re-renders

- **Hover highlighting does NOT trigger React re-renders.** `setColorAt()` + `needsUpdate` mutates the GPU buffer directly.
- **Click DOES trigger a re-render** (to mount/unmount the tooltip), but only on deliberate user clicks — acceptable.

### Temp object reuse

`tempObject` (`THREE.Object3D`) and `tempColor` (`THREE.Color`) are declared at module scope. Reused across all `setMatrixAt`/`setColorAt` calls, avoiding allocation of 550 objects during initialization.

---

## Detailed Task List

### Phase 1: Project Initialization
- [x] **1.1** Scaffold Vite + React + TypeScript project (`npm create vite@latest . -- --template react-ts`)
- [x] **1.2** Install core dependencies (`three`, `@react-three/fiber`, `@react-three/drei`)
- [x] **1.3** Install dev dependencies (`@types/three`)
- [x] **1.4** Install Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`)
- [x] **1.5** Configure `vite.config.ts` — add `react()` and `tailwindcss()` plugins
- [x] **1.6** Replace `src/index.css` contents with `@import "tailwindcss";`
- [x] **1.7** Delete scaffolded boilerplate: `src/App.css`, Vite/React SVG logos
- [x] **1.8** Verify dev server starts cleanly with `npm run dev`

### Phase 2: Data Layer (no UI dependencies)
- [x] **2.1** Create directory structure: `src/types/`, `src/data/`, `src/hooks/`, `src/components/`
- [x] **2.2** Create `src/types/warehouse.ts` — define `WarehouseItem` and `WarehouseData` interfaces
- [x] **2.3** Create `src/data/generateWarehouseData.ts`:
  - [x] Define layout constants (ROWS=10, COLS=11, LEVELS=5, spacing values)
  - [x] Implement `generateSku()` helper (random letter + 5-digit number)
  - [x] Implement `generateWarehouseData()` — triple-nested loop producing 550 items
  - [x] Center positions at world origin using offset math
  - [x] Assign ~70% occupancy rate, SKUs only for occupied slots
- [x] **2.4** Create `src/hooks/useWarehouseData.ts`:
  - [x] Wrap `generateWarehouseData()` in `useMemo(() => ..., [])`
  - [x] Partition items into `occupied` and `empty` arrays inside the memo
  - [x] Return `WarehouseData` object with all three arrays

### Phase 3: 3D Scene Foundation
- [x] **3.1** Create `src/components/Scene.tsx`:
  - [x] Set up `<Canvas>` with `shadows` prop, camera at `[25, 20, 25]`, fov 50
  - [x] Add `<ambientLight>` intensity 0.4
  - [x] Add `<directionalLight>` with shadow configuration:
    - Position `[20, 30, 10]`, intensity 1.2, castShadow
    - Shadow map 2048x2048
    - Shadow camera frustum +/-30 units, near 0.5, far 80
  - [x] Add floor `<mesh>` — planeGeometry `[80, 60]`, rotated -90deg X, color `#2c3e50`, receiveShadow
  - [x] Add `<OrbitControls>` from drei — enableDamping, dampingFactor 0.08, min/maxDistance, maxPolarAngle
- [x] **3.2** Wire Scene into a minimal `App.tsx` and verify: floor + lights render, orbit controls work

### Phase 4: Core InstancedMesh Rendering
- [x] **4.1** Create `src/components/WarehouseInstances.tsx`:
  - [x] Define module-scope temp objects (`THREE.Object3D`, `THREE.Color`)
  - [x] Define color constants (orange `#e67e22`, light grey `#d5d8dc`, highlight `#f1c40f`)
  - [x] Define component props interface (`occupied`, `empty`, `allItems`)
  - [x] Create refs for both InstancedMesh elements
- [x] **4.2** Implement occupied `<instancedMesh>`:
  - [x] `args={[undefined, undefined, occupied.length]}`
  - [x] `<boxGeometry args={[1.6, 1, 1.2]} />`
  - [x] `<meshStandardMaterial />` (opaque, color from instanceColor)
  - [x] `castShadow` and `receiveShadow`
- [x] **4.3** Implement empty `<instancedMesh>`:
  - [x] Same geometry
  - [x] `<meshStandardMaterial transparent opacity={0.35} depthWrite={false} />`
  - [x] `renderOrder={1}`
- [x] **4.4** Implement `useLayoutEffect` for instance initialization:
  - [x] Loop occupied array: `setMatrixAt(i, ...)` and `setColorAt(i, COLOR_OCCUPIED)`
  - [x] Loop empty array: `setMatrixAt(i, ...)` and `setColorAt(i, COLOR_EMPTY)`
  - [x] Flag `instanceMatrix.needsUpdate` and `instanceColor.needsUpdate` on both meshes
- [x] **4.5** Mount `<WarehouseInstances>` inside `Scene.tsx`, pass data from `useWarehouseData()`
- [x] **4.6** Verify: 550 boxes render in organized rows/columns/levels, orange and grey are distinct

### Phase 5: Interactivity — Hover Highlight
- [x] **5.1** Add `onPointerOver` handler to both `<instancedMesh>` elements:
  - [x] Extract `e.instanceId`, guard against `undefined`
  - [x] Call `e.stopPropagation()`
  - [x] `setColorAt(instanceId, COLOR_HIGHLIGHT)` + `needsUpdate = true`
- [x] **5.2** Add `onPointerOut` handler to both `<instancedMesh>` elements:
  - [x] Restore original color (orange for occupied mesh, grey for empty mesh)
  - [x] `needsUpdate = true`
- [x] **5.3** Wrap handlers in `useCallback` for stable references
- [x] **5.4** Verify: hovering turns a box yellow/gold, leaving restores original color

### Phase 6: Interactivity — Click & Tooltip
- [x] **6.1** Add `selectedItem` state (`useState<WarehouseItem | null>(null)`)
- [x] **6.2** Add `onClick` handler to both `<instancedMesh>` elements:
  - [x] Map `instanceId` to the correct item from the occupied/empty array
  - [x] Toggle selection (click same item deselects)
- [x] **6.3** Create `src/components/LocationTooltip.tsx`:
  - [x] Use drei `<Html position={item.position} center distanceFactor={15}>`
  - [x] Style with Tailwind: dark card (`bg-gray-900`), rounded, shadow
  - [x] Display Location ID, Status (color-coded), SKU (if present)
  - [x] Add close button
  - [x] `pointerEvents: 'auto'` on Html style
  - [x] `e.stopPropagation()` on inner div click to prevent canvas click-through
- [x] **6.4** Conditionally render `<LocationTooltip>` when `selectedItem` is set
- [x] **6.5** Verify: clicking a box shows tooltip, clicking again dismisses, tooltip tracks camera orbit

### Phase 7: UI Overlay & Polish
- [x] **7.1** Update `src/App.tsx` with final layout:
  - [x] Full-viewport wrapper: `div.relative.w-screen.h-screen.bg-black`
  - [x] `<Scene />` component
  - [x] Legend overlay (absolute top-left):
    - Title "Warehouse 3D View"
    - Orange square + "Occupied" label
    - Grey/transparent square + "Empty" label
    - "Click a location for details" hint
  - [x] `pointer-events-none` on legend to not block orbit controls
- [x] **7.2** Clean up `src/main.tsx` — ensure it imports `index.css` and renders `<App />`

### Phase 8: Verification & Testing
- [x] **8.1** Full restart: `npm run dev` — no console errors or warnings
- [x] **8.2** Visual check: floor, 550 boxes in grid layout, correct colors
- [x] **8.3** Orbit controls: rotate (left-drag), zoom (scroll), pan (right-drag), damping feels smooth
- [x] **8.4** Hover: boxes highlight on mouseover, restore on mouseout
- [x] **8.5** Click: tooltip appears with correct data, dismisses on re-click or close button
- [x] **8.6** Performance: open browser DevTools Performance tab — confirm 60 FPS, ~3 draw calls
- [x] **8.7** Transparency: empty boxes visually semi-transparent, no z-fighting or render order artifacts

