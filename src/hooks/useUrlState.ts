import { useCallback } from 'react'

type UrlValue = string | null | undefined

export function useUrlState() {
  const updateUrl = useCallback((params: Record<string, UrlValue>) => {
    const url = new URL(window.location.href)

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        url.searchParams.delete(key)
      } else {
        url.searchParams.set(key, value)
      }
    })

    window.history.replaceState({}, '', url.toString())
  }, [])

  const getParam = useCallback((key: string) => {
    return new URL(window.location.href).searchParams.get(key)
  }, [])

  return { updateUrl, getParam }
}
