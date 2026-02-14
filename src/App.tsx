import { Scene } from './components/Scene'

export default function App() {
  return (
    <div className="relative h-screen w-screen bg-black">
      <Scene />

      <div
        className="pointer-events-none absolute top-4 left-4 rounded-lg border border-gray-700
                   bg-gray-900/80 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-sm
                   select-none"
      >
        <h1 className="mb-2 text-base font-bold">Warehouse 3D View</h1>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-orange-500" />
          <span>Occupied</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-gray-400/50" />
          <span>Empty</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">Click a location for details</p>
      </div>
    </div>
  )
}
