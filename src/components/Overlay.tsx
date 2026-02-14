import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { StatsPanel } from './StatsPanel'
import { LayoutConfig } from './LayoutConfig'
import { MiniMap } from './MiniMap'
import type {
  ShadowQuality,
  StatusFilter,
  Theme,
  VizMode,
  WarehouseData,
  WarehouseItem,
  WarehouseLayout,
} from '../types/warehouse'

type Vec3 = [number, number, number]

interface OverlayProps {
  showEmpty: boolean
  setShowEmpty: (show: boolean) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  searchInputRef: RefObject<HTMLInputElement | null>
  matchCount: number
  statusFilter: StatusFilter
  onStatusFilterChange: (filter: StatusFilter) => void
  selectedItems: WarehouseItem[]
  onResetCamera: () => void
  onCameraPreset: (position: Vec3, target: Vec3) => void
  vizMode: VizMode
  onVizModeChange: (mode: VizMode) => void
  shadowQuality: ShadowQuality
  onShadowQualityChange: (quality: ShadowQuality) => void
  onImportData: (payload: unknown) => void
  importMessage: string | null
  importedDataActive: boolean
  onUseGeneratedData: () => void
  onExportPng: () => void
  showTable: boolean
  onToggleTable: () => void
  data: WarehouseData
  layout: WarehouseLayout
  onLayoutChange: (config: WarehouseLayout) => void
  showPerfOverlay: boolean
  onTogglePerfOverlay: () => void
  theme: Theme
  onToggleTheme: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

const CAMERA_PRESETS = [
  { label: 'Top', position: [0, 54, 0.01] as Vec3, target: [0, 0, 0] as Vec3 },
  { label: 'Front', position: [0, 12, 42] as Vec3, target: [0, 4, 0] as Vec3 },
  { label: 'Side', position: [42, 12, 0] as Vec3, target: [0, 4, 0] as Vec3 },
  { label: 'ISO', position: [30, 24, 30] as Vec3, target: [0, 4, 0] as Vec3 },
] as const

export function Overlay({
  showEmpty,
  setShowEmpty,
  searchQuery,
  onSearchChange,
  searchInputRef,
  matchCount,
  statusFilter,
  onStatusFilterChange,
  selectedItems,
  onResetCamera,
  onCameraPreset,
  vizMode,
  onVizModeChange,
  shadowQuality,
  onShadowQualityChange,
  onImportData,
  importMessage,
  importedDataActive,
  onUseGeneratedData,
  onExportPng,
  showTable,
  onToggleTable,
  data,
  layout,
  onLayoutChange,
  showPerfOverlay,
  onTogglePerfOverlay,
  theme,
  onToggleTheme,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: OverlayProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    const updateMobile = () => {
      const mobile = window.innerWidth <= 640
      setIsMobile(mobile)
      if (!mobile) setCollapsed(false)
    }

    updateMobile()
    window.addEventListener('resize', updateMobile)
    return () => window.removeEventListener('resize', updateMobile)
  }, [])

  const isLightTheme = theme === 'light'
  const oneSelected = selectedItems.length === 1 ? selectedItems[0] : null

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-6 flex flex-col justify-between select-none">
      <div
        className={`pointer-events-auto rounded-xl border shadow-2xl transition-all w-full sm:max-w-sm ${
          isLightTheme
            ? 'bg-slate-100/90 border-slate-300 text-slate-700'
            : 'bg-slate-900/80 border-slate-700/50 text-slate-200'
        } ${collapsed ? 'p-2 max-w-[13rem]' : 'p-4'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className={`text-lg font-bold tracking-tight ${isLightTheme ? 'text-slate-800' : 'text-slate-100'}`}>
            Warehouse <span className="text-orange-500">Visualizer</span>
          </h1>
          <button
            onClick={onToggleTheme}
            className={`rounded px-2 py-1 text-xs border transition-colors ${
              isLightTheme
                ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="Toggle light or dark theme"
          >
            {isLightTheme ? 'Dark' : 'Light'}
          </button>
        </div>

        {isMobile && (
          <button
            className={`text-xs mb-2 ${isLightTheme ? 'text-slate-600' : 'text-slate-400'}`}
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Collapse or expand control panel"
          >
            {collapsed ? '▶ Expand' : '▼ Collapse'}
          </button>
        )}

        {!collapsed && (
          <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onCameraPreset(preset.position, preset.target)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    isLightTheme
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-label={`Set ${preset.label} camera preset`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={onResetCamera}
                className={`ml-auto px-2 py-1 text-xs rounded border transition-colors ${
                  isLightTheme
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
                aria-label="Reset camera"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className={`text-sm ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>Show Empty Slots</label>
              <button
                role="switch"
                aria-checked={showEmpty}
                aria-label="Toggle empty slot visibility"
                onClick={() => setShowEmpty(!showEmpty)}
                className={`w-11 h-6 rounded-full px-1 flex items-center transition-colors ${
                  showEmpty ? 'bg-orange-500' : isLightTheme ? 'bg-slate-400' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    showEmpty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search ID or SKU..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                  isLightTheme
                    ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    : 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500'
                }`}
                aria-label="Search by location ID or SKU"
              />
              {searchQuery && (
                <p className={`text-xs mt-1 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                  {matchCount} location{matchCount !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
              className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                isLightTheme
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-800 border-slate-600 text-slate-100'
              }`}
              aria-label="Filter by location status"
            >
              <option value="all">All Statuses</option>
              <option value="occupied">Occupied Only</option>
              <option value="empty">Empty Only</option>
            </select>

            <div className="flex gap-1">
              {(['status', 'heatmap'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onVizModeChange(mode)}
                  className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                    vizMode === mode
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : isLightTheme
                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-label={`Switch to ${mode} visualization`}
                >
                  {mode === 'status' ? 'Status' : 'Heatmap'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <label className={`text-sm ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>Shadow Quality</label>
              <select
                value={shadowQuality}
                onChange={(event) => onShadowQualityChange(event.target.value as ShadowQuality)}
                className={`rounded border px-2 py-1 text-xs ${
                  isLightTheme
                    ? 'bg-white border-slate-300 text-slate-700'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}
                aria-label="Select shadow quality"
              >
                <option value="high">High (2048)</option>
                <option value="low">Low (512)</option>
                <option value="off">Off</option>
              </select>
            </div>

            <StatsPanel data={data} isLightTheme={isLightTheme} />

            <div className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Legend
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.35)]" />
                  <span className="text-sm">Occupied</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-sm border ${isLightTheme ? 'border-slate-500' : 'border-slate-400'} bg-transparent`} />
                  <span className="text-sm">Empty</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm bg-emerald-500" />
                  <span className="text-sm">Selected</span>
                </div>
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                  Selection ({selectedItems.length})
                </h2>

                {oneSelected ? (
                  <div className="space-y-1">
                    <div className={`text-sm font-mono ${isLightTheme ? 'text-slate-800' : 'text-slate-100'}`}>
                      ID: {oneSelected.id}
                    </div>
                    <div className="text-sm">
                      Status:{' '}
                      <span className={oneSelected.status === 'occupied' ? 'text-orange-500' : isLightTheme ? 'text-slate-500' : 'text-slate-500'}>
                        {oneSelected.status}
                      </span>
                    </div>
                    {oneSelected.sku && (
                      <div className="text-sm">
                        SKU: <span className={`font-mono ${isLightTheme ? 'text-slate-800' : 'text-slate-100'}`}>{oneSelected.sku}</span>
                      </div>
                    )}
                    <div className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-500'}`}>
                      Pos: [{oneSelected.position.map((value) => value.toFixed(1)).join(', ')}]
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.id} className={`text-sm font-mono ${isLightTheme ? 'text-slate-700' : 'text-slate-100'}`}>
                        {item.id} {item.sku ? `- ${item.sku}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <details className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
              <summary className={`cursor-pointer text-xs font-semibold uppercase tracking-wider ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Data Tools
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label
                    className={`cursor-pointer rounded border px-2 py-1 text-xs transition-colors ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    Import JSON
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return

                        try {
                          const text = await file.text()
                          onImportData(JSON.parse(text))
                          setFileError(null)
                        } catch {
                          setFileError('The uploaded file is not valid JSON.')
                        } finally {
                          event.target.value = ''
                        }
                      }}
                      aria-label="Import warehouse JSON file"
                    />
                  </label>
                  <button
                    onClick={onExportPng}
                    className={`rounded border px-2 py-1 text-xs transition-colors ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    aria-label="Export canvas snapshot as PNG"
                  >
                    Export PNG
                  </button>
                  <button
                    onClick={onToggleTable}
                    className={`rounded border px-2 py-1 text-xs transition-colors ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    aria-label="Toggle data table"
                  >
                    {showTable ? 'Hide Table' : 'Show Table'}
                  </button>
                  {importedDataActive && (
                    <button
                      onClick={onUseGeneratedData}
                      className={`rounded border px-2 py-1 text-xs transition-colors ${
                        isLightTheme
                          ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                      aria-label="Switch back to generated warehouse data"
                    >
                      Use Generated
                    </button>
                  )}
                </div>
                {(fileError || importMessage) && (
                  <p className={`text-xs ${fileError ? 'text-red-400' : isLightTheme ? 'text-emerald-600' : 'text-emerald-400'}`}>
                    {fileError ?? importMessage}
                  </p>
                )}
              </div>
            </details>

            <details className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
              <summary className={`cursor-pointer text-xs font-semibold uppercase tracking-wider ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Layout
              </summary>
              <div className="mt-3">
                <LayoutConfig config={layout} onChange={onLayoutChange} isLightTheme={isLightTheme} />
              </div>
            </details>

            <details className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
              <summary className={`cursor-pointer text-xs font-semibold uppercase tracking-wider ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                View State
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>Performance Overlay</span>
                  <button
                    onClick={onTogglePerfOverlay}
                    className={`rounded border px-2 py-1 text-xs transition-colors ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    aria-label="Toggle performance overlay"
                  >
                    {showPerfOverlay ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`flex-1 rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    aria-label="Undo view state"
                  >
                    Undo
                  </button>
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`flex-1 rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                      isLightTheme
                        ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                    aria-label="Redo view state"
                  >
                    Redo
                  </button>
                </div>
              </div>
            </details>

            <div className={`pt-4 border-t ${isLightTheme ? 'border-slate-300' : 'border-slate-700/50'}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Mini Map
              </h2>
              <MiniMap items={data.items} layout={layout} selectedIds={selectedItems.map((item) => item.id)} isLightTheme={isLightTheme} />
            </div>
          </div>
        )}
      </div>

      <div className={`absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 text-xs text-center pointer-events-none ${isLightTheme ? 'text-slate-500' : 'text-slate-500'}`}>
        Left Click: Rotate • Right Click: Pan • Scroll: Zoom • Shift+Click: Multi-select • /: Focus Search
      </div>
    </div>
  )
}
