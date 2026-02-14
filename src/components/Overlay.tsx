import type { WarehouseItem } from '../types/warehouse'

interface OverlayProps {
  showEmpty: boolean
  setShowEmpty: (show: boolean) => void
  onResetCamera: () => void
  selectedItem: WarehouseItem | null
}

export function Overlay({ showEmpty, setShowEmpty, onResetCamera, selectedItem }: OverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between select-none">
      {/* Top Left: Controls & Legend */}
      <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 shadow-2xl max-w-xs transition-all hover:bg-slate-900/90">
        <h1 className="text-xl font-bold text-slate-100 mb-4 tracking-tight">
          Warehouse <span className="text-orange-500">Visualizer</span>
        </h1>
        
        {/* Toggle */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
          <label className="text-sm font-medium text-slate-300">Show Empty Slots</label>
          <button
            onClick={() => setShowEmpty(!showEmpty)}
            className={`w-11 h-6 flex items-center rounded-full px-1 transition-colors duration-200 ${
              showEmpty ? 'bg-orange-500' : 'bg-slate-600'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                showEmpty ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
            <span className="text-sm text-slate-300">Occupied</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-sm border border-slate-400 bg-transparent" />
            <span className="text-sm text-slate-300">Empty</span>
          </div>
        </div>

        {/* Selected Item Detail */}
        {selectedItem && (
           <div className="mt-4 pt-4 border-t border-slate-700/50">
             <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Selection</h2>
             <div className="text-sm text-slate-100 font-mono">
               ID: {selectedItem.id}
             </div>
             {/* Add more details here if available in WarehouseItem */}
           </div>
        )}
      </div>

      {/* Bottom Right: Actions */}
      <div className="pointer-events-auto flex justify-end">
        <button
          onClick={onResetCamera}
          className="group bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-slate-700/50 shadow-xl hover:bg-orange-500 hover:border-orange-500 transition-all active:scale-95"
          title="Reset Camera View"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
      
      {/* Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500 text-xs text-center pointer-events-none">
        Left Click: Rotate • Right Click: Pan • Scroll: Zoom • Click Item: Select
      </div>
    </div>
  )
}
