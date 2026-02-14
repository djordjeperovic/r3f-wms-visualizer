import type { WarehouseItem } from '../types/warehouse'

interface DataTableProps {
  items: WarehouseItem[]
  selectedIds: string[]
  onSelectItem: (item: WarehouseItem) => void
  isLightTheme: boolean
}

export function DataTable({ items, selectedIds, onSelectItem, isLightTheme }: DataTableProps) {
  const selectedSet = new Set(selectedIds)

  return (
    <div
      className={`absolute inset-x-0 bottom-0 h-1/3 overflow-y-auto border-t backdrop-blur-md ${
        isLightTheme ? 'bg-slate-100/95 border-slate-300' : 'bg-slate-900/95 border-slate-700'
      }`}
    >
      <table className={`w-full text-sm ${isLightTheme ? 'text-slate-700' : 'text-slate-300'}`}>
        <thead
          className={`sticky top-0 text-xs uppercase ${isLightTheme ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-slate-400'}`}
        >
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">SKU</th>
            <th className="px-4 py-2 text-left">Position</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`cursor-pointer border-b transition-colors ${
                isLightTheme ? 'border-slate-200 hover:bg-slate-200/70' : 'border-slate-800 hover:bg-slate-800'
              } ${selectedSet.has(item.id) ? (isLightTheme ? 'bg-orange-100/70' : 'bg-orange-500/15') : ''}`}
            >
              <td className="px-4 py-2 font-mono">{item.id}</td>
              <td className="px-4 py-2">
                <span className={item.status === 'occupied' ? 'text-orange-400' : isLightTheme ? 'text-slate-500' : 'text-slate-500'}>
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-2 font-mono">{item.sku ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-xs">
                [{item.position.map((value) => value.toFixed(1)).join(', ')}]
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
