import { useMemo, useState } from 'react'
import type { WarehouseData } from '../types/warehouse'

interface StatsPanelProps {
  data: WarehouseData
  isLightTheme: boolean
}

function parseRowFromId(id: string): number | null {
  const match = /^R(\d+)-C\d+-L\d+$/i.exec(id)
  if (!match) return null

  return Number(match[1])
}

export function StatsPanel({ data, isLightTheme }: StatsPanelProps) {
  const [showRows, setShowRows] = useState(false)
  const occupancyPct = ((data.occupied.length / Math.max(data.items.length, 1)) * 100).toFixed(1)

  const rowStats = useMemo(() => {
    const stats = new Map<number, { occupied: number; total: number }>()

    data.items.forEach((item) => {
      const row = parseRowFromId(item.id)
      if (row === null) return

      const existing = stats.get(row) ?? { occupied: 0, total: 0 }
      existing.total += 1
      if (item.status === 'occupied') existing.occupied += 1
      stats.set(row, existing)
    })

    return Array.from(stats.entries()).sort((a, b) => a[0] - b[0])
  }, [data.items])

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={`rounded-lg p-2 text-center ${isLightTheme ? 'bg-slate-200/70' : 'bg-slate-800/60'}`}>
          <div className={`text-lg font-bold ${isLightTheme ? 'text-slate-800' : 'text-slate-100'}`}>
            {data.items.length}
          </div>
          <div className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Total</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${isLightTheme ? 'bg-orange-100/80' : 'bg-slate-800/60'}`}>
          <div className={`text-lg font-bold ${isLightTheme ? 'text-orange-700' : 'text-orange-400'}`}>
            {data.occupied.length}
          </div>
          <div className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Occupied</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${isLightTheme ? 'bg-slate-200/70' : 'bg-slate-800/60'}`}>
          <div className={`text-lg font-bold ${isLightTheme ? 'text-slate-700' : 'text-slate-400'}`}>
            {data.empty.length}
          </div>
          <div className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>Empty</div>
        </div>
      </div>

      <div className={`rounded-full h-2 ${isLightTheme ? 'bg-slate-300' : 'bg-slate-700'}`}>
        <div
          className="bg-orange-500 h-2 rounded-full transition-all"
          style={{ width: `${occupancyPct}%` }}
        />
      </div>
      <div className={`text-xs text-center mt-1 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
        {occupancyPct}% Occupancy
      </div>

      <button
        onClick={() => setShowRows((value) => !value)}
        className={`mt-3 text-xs transition-colors ${
          isLightTheme ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-expanded={showRows}
        aria-controls="row-breakdown"
      >
        {showRows ? 'Hide row breakdown' : 'Show row breakdown'}
      </button>

      {showRows && (
        <div id="row-breakdown" className="mt-2 space-y-1.5">
          {rowStats.map(([row, stat]) => {
            const pct = (stat.occupied / Math.max(stat.total, 1)) * 100
            return (
              <div key={row} className="flex items-center gap-2 text-xs">
                <span className={`w-8 ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>{`R${row}`}</span>
                <div className={`flex-1 rounded-full h-1.5 ${isLightTheme ? 'bg-slate-300' : 'bg-slate-700'}`}>
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className={`w-12 text-right ${isLightTheme ? 'text-slate-500' : 'text-slate-500'}`}>
                  {stat.occupied}/{stat.total}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
