import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Scene } from './components/Scene'
import { Overlay } from './components/Overlay'
import { ContextMenu } from './components/ContextMenu'
import { DataTable } from './components/DataTable'
import { GuidedTour } from './components/GuidedTour'
import { useWarehouseData } from './hooks/useWarehouseData'
import { usePersistedState } from './hooks/usePersistedState'
import { useTheme } from './hooks/useTheme'
import { useUrlState } from './hooks/useUrlState'
import { useUndoRedo, type HistoryEntry } from './hooks/useUndoRedo'
import { validateWarehouseItems } from './utils/validateWarehouseData'
import type {
  CameraView,
  ContextMenuState,
  ShadowQuality,
  StatusFilter,
  Theme,
  VizMode,
  WarehouseItem,
  WarehouseLayout,
} from './types/warehouse'
import { DEFAULT_LAYOUT } from './types/warehouse'

const DEFAULT_CAMERA_VIEW: CameraView = {
  position: [30, 25, 30],
  target: [0, 4, 0],
}

function matchesSearch(item: WarehouseItem, query: string) {
  if (!query) return true

  const idMatch = item.id.toLowerCase().includes(query)
  const skuMatch = item.sku?.toLowerCase().includes(query) ?? false
  return idMatch || skuMatch
}

function isInputLike(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

function parseVec3(value: string | null): [number, number, number] | null {
  if (!value) return null
  const parts = value.split(',').map((entry) => Number(entry.trim()))
  if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) return null
  return [parts[0], parts[1], parts[2]]
}

function formatVec3(value: [number, number, number]) {
  return value.map((entry) => entry.toFixed(2)).join(',')
}

function parseStatusFilter(value: string | null): StatusFilter | undefined {
  if (value === 'all' || value === 'occupied' || value === 'empty') return value
  return undefined
}

function parseVizMode(value: string | null): VizMode | undefined {
  if (value === 'status' || value === 'heatmap') return value
  return undefined
}

function parseTheme(value: string | null): Theme | undefined {
  if (value === 'dark' || value === 'light') return value
  return undefined
}

function parseShadowQuality(value: string | null): ShadowQuality | undefined {
  if (value === 'high' || value === 'low' || value === 'off') return value
  return undefined
}

function parseBooleanFlag(value: string | null): boolean | undefined {
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

function areViewsEqual(left: CameraView, right: CameraView) {
  const round = (input: number) => Math.round(input * 100) / 100

  return (
    left.position.every((value, index) => round(value) === round(right.position[index])) &&
    left.target.every((value, index) => round(value) === round(right.target[index]))
  )
}

function buildHistoryEntry(selectedItems: WarehouseItem[], cameraView: CameraView): HistoryEntry {
  return {
    selectedIds: selectedItems.map((item) => item.id),
    cameraPosition: [...cameraView.position],
    cameraTarget: [...cameraView.target],
  }
}

function getFocusCameraView(item: WarehouseItem): CameraView {
  const [x, y, z] = item.position

  return {
    position: [x + 9, y + 6, z + 9],
    target: [x, y, z],
  }
}

function LoadingFallback({ isLightTheme }: { isLightTheme: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center ${isLightTheme ? 'bg-slate-100' : 'bg-slate-900'}`}
      role="status"
      aria-label="Loading 3D scene"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <p className={`text-sm ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Loading scene...</p>
      </div>
    </div>
  )
}

export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const { updateUrl } = useUrlState()

  const initialQuery = urlParams.get('q') ?? ''
  const initialStatus = parseStatusFilter(urlParams.get('status'))
  const initialVizMode = parseVizMode(urlParams.get('viz'))
  const initialTheme = parseTheme(urlParams.get('theme'))
  const initialShowEmpty = parseBooleanFlag(urlParams.get('showEmpty'))
  const initialShadowQuality = parseShadowQuality(urlParams.get('shadow'))
  const initialShowTable = parseBooleanFlag(urlParams.get('table'))
  const initialShowPerf = parseBooleanFlag(urlParams.get('perf'))
  const initialSelectedIds = useMemo(() => {
    return (urlParams.get('selected') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }, [urlParams])
  const initialCameraFromUrl = useMemo(() => {
    const position = parseVec3(urlParams.get('cam'))
    const target = parseVec3(urlParams.get('target'))
    if (!position || !target) return null
    return { position, target } as CameraView
  }, [urlParams])

  const { theme, setTheme, config: themeConfig } = useTheme(initialTheme)

  const [showEmpty, setShowEmpty] = usePersistedState<boolean>(
    'wms-show-empty',
    true,
    initialShowEmpty !== undefined ? { overrideValue: initialShowEmpty } : undefined,
  )
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilter>(
    'wms-status-filter',
    'all',
    initialStatus ? { overrideValue: initialStatus } : undefined,
  )
  const [vizMode, setVizMode] = usePersistedState<VizMode>(
    'wms-viz-mode',
    'status',
    initialVizMode ? { overrideValue: initialVizMode } : undefined,
  )
  const [shadowQuality, setShadowQuality] = usePersistedState<ShadowQuality>(
    'wms-shadow-quality',
    'high',
    initialShadowQuality ? { overrideValue: initialShadowQuality } : undefined,
  )
  const [layout, setLayout] = usePersistedState<WarehouseLayout>('wms-layout', DEFAULT_LAYOUT)
  const [showTable, setShowTable] = usePersistedState<boolean>(
    'wms-show-table',
    false,
    initialShowTable !== undefined ? { overrideValue: initialShowTable } : undefined,
  )
  const [showPerfOverlay, setShowPerfOverlay] = usePersistedState<boolean>(
    'wms-show-perf',
    false,
    initialShowPerf !== undefined ? { overrideValue: initialShowPerf } : undefined,
  )

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [importedItems, setImportedItems] = useState<WarehouseItem[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [sceneReady, setSceneReady] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [cameraView, setCameraView] = useState<CameraView>(initialCameraFromUrl ?? DEFAULT_CAMERA_VIEW)
  const [cameraCommand, setCameraCommand] = useState<CameraView | null>(null)
  const [cameraCommandId, setCameraCommandId] = useState(0)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem('wms-tour-complete'))

  const data = useWarehouseData({ layout, importedItems })

  const [selectedItems, setSelectedItems] = useState<WarehouseItem[]>(() => {
    if (initialSelectedIds.length === 0) return []
    return data.items.filter((item) => initialSelectedIds.includes(item.id))
  })

  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const hasLoadedSceneRef = useRef(false)
  const programmaticCameraMoveRef = useRef(false)

  const { push, undo, redo, canUndo, canRedo } = useUndoRedo(80)

  const queueCameraView = useCallback((view: CameraView, recordHistory = true) => {
    if (recordHistory) {
      push(buildHistoryEntry(selectedItems, cameraView))
    }

    programmaticCameraMoveRef.current = true
    setCameraCommand(view)
    setCameraCommandId((value) => value + 1)
  }, [cameraView, push, selectedItems])

  const setSelectionWithHistory = useCallback<Dispatch<SetStateAction<WarehouseItem[]>>>((updater) => {
    setSelectedItems((previous) => {
      const nextValue = typeof updater === 'function' ? updater(previous) : updater
      const unchanged =
        previous.length === nextValue.length &&
        previous.every((item, index) => item.id === nextValue[index]?.id)
      if (unchanged) return previous

      push(buildHistoryEntry(previous, cameraView))

      if (nextValue.length === 1) {
        programmaticCameraMoveRef.current = true
        setCameraCommand(getFocusCameraView(nextValue[0]))
        setCameraCommandId((value) => value + 1)
      }

      return nextValue
    })
  }, [cameraView, push])

  const restoreHistoryEntry = useCallback((entry: HistoryEntry) => {
    const restoredSelection = data.items.filter((item) => entry.selectedIds.includes(item.id))
    const restoredView: CameraView = {
      position: entry.cameraPosition,
      target: entry.cameraTarget,
    }

    setSelectedItems(restoredSelection)
    setCameraView(restoredView)
    queueCameraView(restoredView, false)
  }, [data.items, queueCameraView])

  const handleUndo = useCallback(() => {
    const previous = undo(buildHistoryEntry(selectedItems, cameraView))
    if (!previous) return
    restoreHistoryEntry(previous)
  }, [cameraView, restoreHistoryEntry, selectedItems, undo])

  const handleRedo = useCallback(() => {
    const next = redo(buildHistoryEntry(selectedItems, cameraView))
    if (!next) return
    restoreHistoryEntry(next)
  }, [cameraView, redo, restoreHistoryEntry, selectedItems])

  useEffect(() => {
    updateUrl({
      q: searchQuery || null,
      status: statusFilter !== 'all' ? statusFilter : null,
      viz: vizMode !== 'status' ? vizMode : null,
      showEmpty: showEmpty ? '1' : '0',
      selected: selectedItems.length > 0 ? selectedItems.map((item) => item.id).join(',') : null,
      cam: formatVec3(cameraView.position),
      target: formatVec3(cameraView.target),
      theme: theme !== 'dark' ? theme : null,
      shadow: shadowQuality !== 'high' ? shadowQuality : null,
      table: showTable ? '1' : null,
      perf: showPerfOverlay ? '1' : null,
    })
  }, [
    cameraView,
    searchQuery,
    selectedItems,
    shadowQuality,
    showEmpty,
    showPerfOverlay,
    showTable,
    statusFilter,
    theme,
    updateUrl,
    vizMode,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (contextMenu) setContextMenu(null)
        if (selectedItems.length > 0) setSelectionWithHistory([])
        return
      }

      if (event.key === '/' && !isInputLike(event.target)) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          handleRedo()
          return
        }

        handleUndo()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contextMenu, handleRedo, handleUndo, selectedItems.length, setSelectionWithHistory])

  useEffect(() => {
    if (!contextMenu) return

    const handleWindowClick = () => {
      setContextMenu(null)
    }

    window.addEventListener('click', handleWindowClick)
    window.addEventListener('resize', handleWindowClick)
    return () => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('resize', handleWindowClick)
    }
  }, [contextMenu])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return matchesSearch(item, normalizedQuery)
    })
  }, [data.items, normalizedQuery, statusFilter])

  const matchCount = normalizedQuery ? filteredItems.length : 0

  const handleResetCamera = useCallback(() => {
    queueCameraView(DEFAULT_CAMERA_VIEW)
  }, [queueCameraView])

  const handleCameraPreset = useCallback((position: [number, number, number], target: [number, number, number]) => {
    queueCameraView({ position, target })
  }, [queueCameraView])

  const handleFocusItem = useCallback((item: WarehouseItem, recordHistory = true) => {
    queueCameraView(getFocusCameraView(item), recordHistory)
  }, [queueCameraView])

  const handleSceneCameraChange = useCallback((view: CameraView) => {
    setCameraView((previous) => {
      if (areViewsEqual(previous, view)) return previous

      if (programmaticCameraMoveRef.current) {
        programmaticCameraMoveRef.current = false
      } else {
        push(buildHistoryEntry(selectedItems, previous))
      }

      return view
    })
  }, [push, selectedItems])

  const handleFirstFrame = useCallback(() => {
    if (hasLoadedSceneRef.current) return
    hasLoadedSceneRef.current = true
    setSceneReady(true)
  }, [])

  const handleImportData = useCallback((payload: unknown) => {
    if (!validateWarehouseItems(payload)) {
      setImportMessage('Invalid JSON schema. Expected an array of WarehouseItem records.')
      return
    }

    setImportedItems(payload)
    setImportMessage(`Imported ${payload.length} location${payload.length === 1 ? '' : 's'}.`)
    setSelectedItems([])
  }, [])

  const handleUseGeneratedData = useCallback(() => {
    setImportedItems(null)
    setImportMessage('Switched back to generated layout data.')
    setSelectedItems([])
  }, [])

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) {
      setImportMessage('Canvas export failed: no canvas element found.')
      return
    }

    const link = document.createElement('a')
    link.download = 'warehouse-snapshot.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    setImportMessage('PNG exported.')
  }, [])

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setImportMessage(`${label} copied to clipboard.`)
    } catch {
      setImportMessage(`Unable to copy ${label.toLowerCase()}.`)
    }
  }, [])

  const selectedAnnouncement =
    selectedItems.length > 0
      ? `Selected ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}: ${selectedItems.map((item) => item.id).join(', ')}`
      : 'No items selected'

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: themeConfig.canvasBg }}>
      <Suspense fallback={<LoadingFallback isLightTheme={theme === 'light'} />}>
        <Scene
          data={data}
          layout={layout}
          showEmpty={showEmpty}
          statusFilter={statusFilter}
          selectedItems={selectedItems}
          onSelectItems={setSelectionWithHistory}
          searchQuery={searchQuery}
          vizMode={vizMode}
          shadowQuality={shadowQuality}
          onContextMenu={setContextMenu}
          cameraCommand={cameraCommand}
          cameraCommandId={cameraCommandId}
          initialCameraView={initialCameraFromUrl}
          onCameraChange={handleSceneCameraChange}
          onFirstFrame={handleFirstFrame}
          themeConfig={themeConfig}
          showPerfOverlay={showPerfOverlay}
        />
      </Suspense>

      {!sceneReady && <LoadingFallback isLightTheme={theme === 'light'} />}

      <Overlay
        showEmpty={showEmpty}
        setShowEmpty={setShowEmpty}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        matchCount={matchCount}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedItems={selectedItems}
        onResetCamera={handleResetCamera}
        onCameraPreset={handleCameraPreset}
        vizMode={vizMode}
        onVizModeChange={setVizMode}
        shadowQuality={shadowQuality}
        onShadowQualityChange={setShadowQuality}
        onImportData={handleImportData}
        importMessage={importMessage}
        importedDataActive={importedItems !== null}
        onUseGeneratedData={handleUseGeneratedData}
        onExportPng={handleExportPng}
        showTable={showTable}
        onToggleTable={() => setShowTable((value) => !value)}
        data={data}
        layout={layout}
        onLayoutChange={(nextLayout) => {
          setLayout(nextLayout)
          setImportedItems(null)
          setSelectedItems([])
          setImportMessage('Layout updated. Generated data refreshed.')
        }}
        showPerfOverlay={showPerfOverlay}
        onTogglePerfOverlay={() => setShowPerfOverlay((value) => !value)}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {showTable && (
        <DataTable
          items={filteredItems}
          selectedIds={selectedItems.map((item) => item.id)}
          onSelectItem={(item) => {
            setSelectionWithHistory([item])
          }}
          isLightTheme={theme === 'light'}
        />
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onCopyId={() => {
            void copyToClipboard(contextMenu.item.id, 'ID')
            setContextMenu(null)
          }}
          onFocusCamera={() => {
            handleFocusItem(contextMenu.item)
            setContextMenu(null)
          }}
          onCopySku={() => {
            if (!contextMenu.item.sku) return
            void copyToClipboard(contextMenu.item.sku, 'SKU')
            setContextMenu(null)
          }}
          isLightTheme={theme === 'light'}
        />
      )}

      {showTour && (
        <GuidedTour
          onComplete={() => {
            localStorage.setItem('wms-tour-complete', 'true')
            setShowTour(false)
          }}
          isLightTheme={theme === 'light'}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {selectedAnnouncement}
      </div>
    </div>
  )
}
