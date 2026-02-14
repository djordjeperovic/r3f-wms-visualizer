import { useCallback, useState } from 'react'

export interface HistoryEntry {
  selectedIds: string[]
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
}

export function useUndoRedo(maxHistory = 50) {
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])

  const push = useCallback((entry: HistoryEntry) => {
    setPast((current) => [...current.slice(-(maxHistory - 1)), entry])
    setFuture([])
  }, [maxHistory])

  const undo = useCallback((current: HistoryEntry) => {
    const previous = past[past.length - 1]
    if (!previous) return null

    setPast((currentPast) => currentPast.slice(0, -1))
    setFuture((currentFuture) => [current, ...currentFuture])
    return previous
  }, [past])

  const redo = useCallback((current: HistoryEntry) => {
    const next = future[0]
    if (!next) return null

    setFuture((currentFuture) => currentFuture.slice(1))
    setPast((currentPast) => [...currentPast, current])
    return next
  }, [future])

  return {
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}
