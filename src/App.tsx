import { useState, useCallback } from 'react'
import { Scene } from './components/Scene'
import { Overlay } from './components/Overlay'
import type { WarehouseItem } from './types/warehouse'

export default function App() {
  const [showEmpty, setShowEmpty] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WarehouseItem | null>(null)
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0)

  const handleResetCamera = useCallback(() => {
    setResetCameraTrigger((prev) => prev + 1)
  }, [])

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      <Scene 
        showEmpty={showEmpty} 
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
        resetCameraTrigger={resetCameraTrigger}
      />

      <Overlay 
        showEmpty={showEmpty} 
        setShowEmpty={setShowEmpty}
        onResetCamera={handleResetCamera}
        selectedItem={selectedItem}
      />
    </div>
  )
}
