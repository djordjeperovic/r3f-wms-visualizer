# r3f-wms-visualizer

Interactive 3D warehouse visualization built with React, TypeScript, and react-three-fiber.
The app renders a synthetic rack layout and lets you inspect slot state in a HUD overlay.

## Live app

- GitHub Pages: [https://djordjeperovic.github.io/r3f-wms-visualizer/](https://djordjeperovic.github.io/r3f-wms-visualizer/)

## Features

- 550 generated locations (`10 rows x 11 columns x 5 levels`)
- Occupied vs empty slot rendering with separate instanced meshes
- Empty-slot visibility toggle (`Show Empty Slots`)
- Hover highlight + click-to-select interactions
- Selection details panel in the overlay (`ID`)
- Reset camera action that restores the warehouse-focused default view
- Orbit controls (rotate/pan/zoom)
- Scene postprocessing with SSAO + Bloom

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

## Deployment

- GitHub Pages deployment workflow: `.github/workflows/deploy-pages.yml`
- Triggered automatically on push to `main` and manually via `workflow_dispatch`

## Interaction controls

- Drag in the canvas to orbit the camera
- Scroll to zoom in/out
- Right mouse drag to pan
- Click a location to toggle selection
- Click the selected location again to clear selection
- Use `Show Empty Slots` to hide/show empty locations
- Use `Reset Camera` to restore the default camera framing

## Project structure

- `src/App.tsx`: App shell and legend overlay
- `src/components/Scene.tsx`: Canvas, lighting, floor/grid, orbit controls, postprocessing
- `src/components/Overlay.tsx`: Top-left controls/legend + selection panel + reset camera button
- `src/components/WarehouseInstances.tsx`: Instanced meshes, hover/click interactions, selection state
- `src/hooks/useWarehouseData.ts`: Memoized data generation + partitioning
- `src/data/generateWarehouseData.ts`: Synthetic warehouse grid and occupancy/SKU generation
- `src/types/warehouse.ts`: Shared data contracts

## Data and rendering flow

1. `generateWarehouseData()` creates the warehouse location list and occupancy data.
2. `useWarehouseData()` memoizes that list and splits it into `occupied` and `empty`.
3. `Scene` sets up environment lighting, ground grid/shadows, orbit controls, and postprocessing.
4. `WarehouseInstances` renders occupied + empty instanced meshes and handles selection/hover coloring.
5. `Overlay` exposes UI controls and shows selected slot information.

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
