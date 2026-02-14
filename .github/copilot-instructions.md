# Copilot Instructions for r3f-wms-visualizer

## Build, lint, and test commands
- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Lint the codebase: `npm run lint`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Tests: no `test` script is currently defined in `package.json`, so single-test execution is not available yet.

## MCP server configuration
- Workspace MCP servers are defined in `.vscode/mcp.json`.
- Playwright is configured as a local stdio server via `npx -y @microsoft/mcp-server-playwright`.

## High-level architecture
- `src/main.tsx` mounts `<App />`, and `src/App.tsx` renders a full-screen container with the 3D scene plus a UI legend overlay.
- `src/components/Scene.tsx` owns the `@react-three/fiber` `Canvas` setup (camera, lights, floor plane, orbit controls) and passes warehouse data into the renderer.
- Data is generated client-side: `src/data/generateWarehouseData.ts` creates a synthetic 3D grid of locations with random occupancy and SKU values.
- `src/hooks/useWarehouseData.ts` memoizes that generated dataset once per mount and partitions it into `occupied` and `empty` arrays.
- `src/components/WarehouseInstances.tsx` renders two `THREE.InstancedMesh` collections (occupied and empty), handles hover/click instance interactions, and drives selection state.
- `src/components/LocationTooltip.tsx` uses `@react-three/drei` `Html` to anchor item details directly at the selected instance position.

## Key conventions in this repo
- Keep warehouse entities aligned to `WarehouseItem`/`WarehouseData` from `src/types/warehouse.ts`, including the fixed `[x, y, z]` position tuple.
- Preserve the occupied/empty split rendering model; `WarehouseInstances` assumes instance IDs map directly to indexes within those partitioned arrays.
- When mutating instanced meshes, update matrices/colors in `useLayoutEffect` and set both `instanceMatrix.needsUpdate` and `instanceColor.needsUpdate`.
- Instance pointer handlers should call `stopPropagation()` and guard `event.instanceId` before reading data arrays.
- Styling is utility-first Tailwind in JSX; Tailwind v4 is configured via `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` in `src/index.css`.
- Keep TypeScript/ESLint strictness in mind (`npm run build` runs `tsc -b`; tsconfig enables strict + noUnused checks).
