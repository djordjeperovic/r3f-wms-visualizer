# r3f-wms-visualizer

Interactive 3D warehouse management visualization built with React, TypeScript, and react-three-fiber.
The app renders warehouse locations as instanced boxes and lets you inspect per-location details directly in the scene.

## Features

- 550 generated locations (`10 rows x 11 columns x 5 levels`)
- Occupied vs empty visualization with distinct materials and colors
- Instanced mesh rendering for efficient scene performance
- Hover highlight and click-to-toggle location details
- Orbit camera controls for navigating the warehouse layout

## Tech stack

- React 19 + TypeScript
- Vite 7
- Three.js + `@react-three/fiber` + `@react-three/drei`
- Tailwind CSS v4 (`@tailwindcss/vite`)
- ESLint 9

## Getting started

### Prerequisites

- Node.js 20+ and npm

### Install and run

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and create production build |
| `npm run lint` | Run ESLint across the repository |
| `npm run preview` | Preview the production build locally |

## Interaction controls

- Drag in the canvas to orbit the camera
- Scroll to zoom in/out
- Click a location to open details (ID, status, SKU when occupied)
- Click the same location again or close (`X`) in the tooltip to dismiss

## Project structure

- `src/App.tsx`: App shell and legend overlay
- `src/components/Scene.tsx`: Canvas, lighting, floor, camera controls
- `src/components/WarehouseInstances.tsx`: Instanced meshes, hover/click interactions, selection state
- `src/components/LocationTooltip.tsx`: In-scene HTML tooltip
- `src/hooks/useWarehouseData.ts`: Memoized data generation + partitioning
- `src/data/generateWarehouseData.ts`: Synthetic warehouse grid and occupancy/SKU generation
- `src/types/warehouse.ts`: Shared data contracts

## Data and rendering flow

1. `generateWarehouseData()` creates the warehouse location list and occupancy data.
2. `useWarehouseData()` memoizes that list and splits it into `occupied` and `empty`.
3. `WarehouseInstances` renders two `THREE.InstancedMesh` groups and wires pointer interactions.
4. Selected locations are shown via `LocationTooltip` anchored in 3D space.

## Quality checks

```bash
npm run lint
npm run build
```

Automated tests are not configured yet (`package.json` has no `test` script).

## Copilot MCP setup

Workspace MCP configuration is versioned in `.vscode/mcp.json` and currently includes Playwright MCP.

## License

MIT (see `LICENSE`).
