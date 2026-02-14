import { usePersistedState } from './usePersistedState'
import type { Theme } from '../types/warehouse'

export interface ThemeConfig {
  canvasBg: string
  gridSection: string
  gridCell: string
  fogColor: string
  occupiedColor: string
  emptyColor: string
  dimColor: string
  axisX: string
  axisZ: string
  rackColor: string
  aisleColor: string
  labelColor: string
  tooltipBg: string
  tooltipText: string
}

const THEME_CONFIG: Record<Theme, ThemeConfig> = {
  dark: {
    canvasBg: '#111827',
    gridSection: '#4a5568',
    gridCell: '#2d3748',
    fogColor: '#111827',
    occupiedColor: '#f97316',
    emptyColor: '#cbd5e1',
    dimColor: '#475569',
    axisX: '#ef4444',
    axisZ: '#3b82f6',
    rackColor: '#475569',
    aisleColor: '#eab308',
    labelColor: '#94a3b8',
    tooltipBg: 'rgba(15, 23, 42, 0.9)',
    tooltipText: '#e2e8f0',
  },
  light: {
    canvasBg: '#f1f5f9',
    gridSection: '#cbd5e1',
    gridCell: '#e2e8f0',
    fogColor: '#e2e8f0',
    occupiedColor: '#ea580c',
    emptyColor: '#64748b',
    dimColor: '#94a3b8',
    axisX: '#dc2626',
    axisZ: '#2563eb',
    rackColor: '#64748b',
    aisleColor: '#ca8a04',
    labelColor: '#475569',
    tooltipBg: 'rgba(248, 250, 252, 0.95)',
    tooltipText: '#0f172a',
  },
}

export function useTheme(overrideTheme?: Theme) {
  const [theme, setTheme] = usePersistedState<Theme>(
    'wms-theme',
    'dark',
    overrideTheme ? { overrideValue: overrideTheme } : undefined,
  )

  return {
    theme,
    setTheme,
    config: THEME_CONFIG[theme],
  }
}
