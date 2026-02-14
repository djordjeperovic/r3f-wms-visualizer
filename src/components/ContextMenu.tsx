import type { WarehouseItem } from '../types/warehouse'

interface ContextMenuProps {
  position: { x: number; y: number }
  item: WarehouseItem
  onClose: () => void
  onCopyId: () => void
  onFocusCamera: () => void
  onCopySku: () => void
  isLightTheme: boolean
}

export function ContextMenu({
  position,
  item,
  onClose,
  onCopyId,
  onFocusCamera,
  onCopySku,
  isLightTheme,
}: ContextMenuProps) {
  return (
    <div
      className={`fixed z-50 min-w-44 rounded-lg border py-1 shadow-xl ${
        isLightTheme ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-600'
      }`}
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label={`Actions for ${item.id}`}
    >
      <button
        onClick={onCopyId}
        className={`w-full px-4 py-2 text-left text-sm ${
          isLightTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-700'
        }`}
      >
        Copy ID ({item.id})
      </button>
      <button
        onClick={onFocusCamera}
        className={`w-full px-4 py-2 text-left text-sm ${
          isLightTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-700'
        }`}
      >
        Focus Camera
      </button>
      {item.sku && (
        <button
          onClick={onCopySku}
          className={`w-full px-4 py-2 text-left text-sm ${
            isLightTheme ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-700'
          }`}
        >
          Copy SKU ({item.sku})
        </button>
      )}
      <button
        onClick={onClose}
        className={`w-full px-4 py-2 text-left text-xs uppercase tracking-wide ${
          isLightTheme ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-700'
        }`}
      >
        Close
      </button>
    </div>
  )
}
