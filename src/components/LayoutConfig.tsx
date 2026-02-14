import type { WarehouseLayout } from '../types/warehouse'

interface LayoutConfigProps {
  config: WarehouseLayout
  onChange: (config: WarehouseLayout) => void
  isLightTheme: boolean
}

interface SliderSpec {
  key: keyof WarehouseLayout
  label: string
  min: number
  max: number
  step?: number
}

const SLIDER_SPECS: SliderSpec[] = [
  { key: 'rows', label: 'Rows', min: 2, max: 20, step: 1 },
  { key: 'cols', label: 'Cols', min: 2, max: 20, step: 1 },
  { key: 'levels', label: 'Levels', min: 2, max: 10, step: 1 },
  { key: 'rowSpacing', label: 'Row Gap', min: 2, max: 8, step: 0.5 },
  { key: 'colSpacing', label: 'Col Gap', min: 1, max: 6, step: 0.25 },
  { key: 'levelHeight', label: 'Lvl H', min: 1, max: 3, step: 0.1 },
]

export function LayoutConfig({ config, onChange, isLightTheme }: LayoutConfigProps) {
  return (
    <div className="space-y-2">
      {SLIDER_SPECS.map((spec) => (
        <div key={spec.key} className="flex items-center gap-2">
          <label className={`text-xs w-14 ${isLightTheme ? 'text-slate-600' : 'text-slate-400'}`}>
            {spec.label}
          </label>
          <input
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step ?? 1}
            value={config[spec.key]}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              onChange({ ...config, [spec.key]: nextValue })
            }}
            className="flex-1 accent-orange-500"
            aria-label={`${spec.label} slider`}
          />
          <span className={`text-xs w-10 text-right ${isLightTheme ? 'text-slate-700' : 'text-slate-300'}`}>
            {config[spec.key].toFixed(spec.step && spec.step < 1 ? 1 : 0)}
          </span>
        </div>
      ))}
    </div>
  )
}
