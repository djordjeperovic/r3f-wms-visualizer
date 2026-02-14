import { useEffect, useState } from 'react'

interface PersistedOptions<T> {
  overrideValue?: T
}

export function usePersistedState<T>(key: string, defaultValue: T, options?: PersistedOptions<T>) {
  const [value, setValue] = useState<T>(() => {
    if (options && 'overrideValue' in options) {
      return options.overrideValue as T
    }

    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue

    try {
      return JSON.parse(stored) as T
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
