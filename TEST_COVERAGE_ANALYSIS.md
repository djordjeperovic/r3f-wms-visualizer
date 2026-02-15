# Test Coverage Analysis

## Current State: 0% Coverage

The codebase has zero automated tests. There is no test framework configured — no
Vitest/Jest in `package.json`, no test config files, no test scripts, and no test
files. The project is ~1,900 lines of TypeScript across 20 source files. TypeScript
strict mode and ESLint catch compile-time issues, but there is no runtime verification
of behavior.

---

## Recommended Test Strategy

Use **Vitest** (integrates with the existing Vite setup) plus **@testing-library/react**
for component tests.

---

## Priority 1: Pure Functions (Highest Value, Easiest to Test)

No React, Three.js, or DOM dependencies — straightforward unit tests.

### `src/utils/validateWarehouseData.ts`

Validates arbitrary JSON against the `WarehouseItem` schema. This is a system boundary
(user-imported data) where bugs cause silent data corruption.

Suggested test cases:
- Valid arrays of warehouse items (occupied with SKU, empty without)
- Empty array (valid edge case)
- Non-array input (`null`, `undefined`, `{}`, `"string"`, `42`)
- Items with missing fields (`id`, `position`, `status`)
- Items with wrong types (`position: "not-a-tuple"`, `status: "invalid"`)
- Position tuples with wrong length (`[1,2]`, `[1,2,3,4]`)
- Position tuples with non-finite values (`NaN`, `Infinity`, `-Infinity`)
- Items with extra fields (should still pass)
- SKU as non-string type

### `src/data/generateWarehouseData.ts`

Generates the entire warehouse dataset — bugs here affect every downstream component.

Suggested test cases:
- Default layout produces `rows * cols * levels` (550) items
- Custom layout produces correct count
- Every item has a valid ID format (`R{n}-C{n}-L{n}`)
- All positions are centered around origin correctly
- All items have status `'occupied'` or `'empty'`
- Occupied items have a SKU matching `X-NNNNN`; empty items have `undefined`
- No duplicate IDs
- Small layout (2x2x2) for deterministic position verification

### Embedded pure functions in `App.tsx` (lines 31–94)

These ~10 functions are currently private to `App.tsx`. Extracting them into a `utils/`
module would make them independently testable:

- `matchesSearch(item, query)` — search by ID and SKU substring
- `isInputLike(target)` — detect input elements
- `parseVec3(value)` / `formatVec3(value)` — camera vector serialization
- `parseStatusFilter()`, `parseVizMode()`, `parseTheme()`, `parseShadowQuality()` — URL parsers
- `parseBooleanFlag(value)` — `"1"` / `"0"` / other
- `areViewsEqual(a, b)` — camera view comparison with rounding

### Embedded pure functions in `WarehouseInstances.tsx` (lines 40–67)

- `parseRowCol(id)` — extract row/col from ID string
- `matchesSearch(item, query)` — duplicated from App.tsx
- `getHeatmapColor(density)` — density → color interpolation

---

## Priority 2: Custom Hooks (High Value, Moderate Effort)

Requires `renderHook` from `@testing-library/react`.

### `src/hooks/useUndoRedo.ts`

Complex stateful logic with edge cases around stack limits and sequencing.

Suggested test cases:
- Push then undo retrieves entries in reverse order
- Redo after undo restores forward
- Push after undo clears the redo stack
- Stack respects `maxHistory` limit
- `canUndo` / `canRedo` flags are accurate at each step
- Undo/redo on empty stack returns `null`

### `src/hooks/usePersistedState.ts`

Interacts with `localStorage` — needs mocking but is straightforward.

Suggested test cases:
- Returns default value when localStorage is empty
- Reads existing value from localStorage on init
- Writes to localStorage on state change
- `overrideValue` takes precedence over localStorage
- Handles corrupt JSON gracefully (falls back to default)

### `src/hooks/useWarehouseData.ts` — `partitionWarehouseItems()`

Exported pure function that splits items into occupied/empty partitions.

Suggested test cases:
- All occupied → empty array is empty
- All empty → occupied array is empty
- Mixed items → correct partitioning
- Empty input → all arrays empty

### `src/hooks/useUrlState.ts`

Interacts with `window.location` and `window.history`.

Suggested test cases:
- `updateUrl` sets parameters on the URL
- `updateUrl` removes params when value is `null` / `undefined` / `""`
- `getParam` reads current URL parameters

### `src/hooks/useTheme.ts`

Suggested test cases:
- Default theme is `'dark'`
- `overrideTheme` forces the correct theme
- `setTheme` toggles and config object updates
- All `ThemeConfig` fields are present

---

## Priority 3: React Components (Moderate Value, Higher Effort)

Requires `@testing-library/react` and potentially mocking Three.js/R3F.

### Simple components (low effort)

| Component | Lines | Key test cases |
|-----------|-------|----------------|
| `ContextMenu.tsx` | 67 | Renders item ID; "Copy SKU" conditional on SKU; click handlers fire |
| `DataTable.tsx` | 55 | Renders all items as rows; highlights selected; click calls handler |
| `GuidedTour.tsx` | 55 | Steps advance with "Next"; "Done" on last step calls `onComplete` |
| `StatsPanel.tsx` | 100 | Correct counts; occupancy bar width; collapsible rows |
| `MiniMap.tsx` | 45 | Correct circle count; selected items have green/larger radius |

### Complex component (high effort)

| Component | Lines | Key test cases |
|-----------|-------|----------------|
| `Overlay.tsx` | 484 | Search input; filter dropdown; camera presets; import/export flow; theme toggle |

---

## Priority 4: Integration & E2E (Lower Priority)

### `App.tsx` (546 lines)

- URL parameter parsing → state → rendering → URL updates
- Keyboard shortcuts (Escape, `/`, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
- Import/export flow end-to-end
- Selection + history tracking

Better covered by Playwright E2E tests once unit/hook tests exist.

### 3D Scene components

`Scene.tsx`, `WarehouseInstances.tsx`, `RackStructure.tsx`, `RowLabels.tsx`,
`LevelIndicators.tsx`, `AisleMarkings.tsx`

These depend heavily on Three.js/R3F and are difficult to unit test. Consider:
- `@react-three/test-renderer` for structural tests
- Visual regression testing for rendering accuracy

---

## Summary Table

| Priority | Area | Files | Effort | Impact |
|----------|------|-------|--------|--------|
| **P1** | Pure utility functions | `validateWarehouseData`, `generateWarehouseData`, extracted parsers | Low | High |
| **P2** | Custom hooks | `useUndoRedo`, `usePersistedState`, `useWarehouseData`, `useUrlState`, `useTheme` | Medium | High |
| **P3** | Simple UI components | `ContextMenu`, `DataTable`, `GuidedTour`, `StatsPanel`, `MiniMap` | Medium | Medium |
| **P3** | Complex UI component | `Overlay` | High | Medium |
| **P4** | Integration / E2E | `App.tsx`, keyboard shortcuts, URL sync | High | Medium |
| **P4** | 3D Scene | `Scene`, `WarehouseInstances`, `RackStructure` | Very High | Lower |

---

## Recommended Setup

1. **Install dependencies:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. **Create `vitest.config.ts`** extending the existing Vite config with `test.environment: 'jsdom'`

3. **Add scripts** to `package.json`:
   ```json
   "test": "vitest",
   "test:coverage": "vitest run --coverage"
   ```

4. **Extract pure functions** from `App.tsx` and `WarehouseInstances.tsx` into `src/utils/`

5. **Write tests** in Priority 1 → Priority 2 → Priority 3 order

---

## Key Refactoring to Enable Testing

The biggest structural improvement: extract the ~10 pure functions currently embedded
in `App.tsx` (lines 31–94) and `WarehouseInstances.tsx` (lines 40–67) into dedicated
utility modules. This immediately makes ~150 lines of critical logic testable with zero
mocking required.

The duplicated `matchesSearch` function in both files should also be consolidated into
a single shared utility.
