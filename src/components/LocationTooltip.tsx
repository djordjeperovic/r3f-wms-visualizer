import { Html } from '@react-three/drei'
import type { WarehouseItem } from '../types/warehouse'

interface LocationTooltipProps {
  item: WarehouseItem
  onClose: () => void
}

export function LocationTooltip({ item, onClose }: LocationTooltipProps) {
  return (
    <Html
      position={item.position}
      center
      distanceFactor={15}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="min-w-[180px] select-none rounded-lg border border-gray-700 bg-gray-900
                   px-4 py-3 text-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">Location Details</span>
          <button
            type="button"
            className="ml-4 text-xs text-gray-400 hover:text-white"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-400">ID:</span>{' '}
            <span className="font-mono">{item.id}</span>
          </p>
          <p>
            <span className="text-gray-400">Status:</span>{' '}
            <span className={item.status === 'occupied' ? 'text-orange-400' : 'text-gray-400'}>
              {item.status}
            </span>
          </p>
          {item.sku && (
            <p>
              <span className="text-gray-400">SKU:</span>{' '}
              <span className="font-mono">{item.sku}</span>
            </p>
          )}
        </div>
      </div>
    </Html>
  )
}
