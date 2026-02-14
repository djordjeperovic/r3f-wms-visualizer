import { useState } from 'react'

const TOUR_STEPS = [
  'Orange boxes are occupied and outlined slots are empty locations.',
  'Use search and filters in the control panel to narrow down locations quickly.',
  'Left-click to orbit, right-click to pan, scroll to zoom.',
  'Click a location to inspect details, or shift-click to multi-select.',
]

interface GuidedTourProps {
  onComplete: () => void
  isLightTheme: boolean
}

export function GuidedTour({ onComplete, isLightTheme }: GuidedTourProps) {
  const [step, setStep] = useState(0)

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 px-4">
      <div
        className={`w-full max-w-sm rounded-xl border p-6 shadow-2xl ${
          isLightTheme ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-600'
        }`}
      >
        <h2 className={`text-sm font-semibold mb-3 ${isLightTheme ? 'text-slate-700' : 'text-slate-100'}`}>
          Quick Tour
        </h2>

        <p className={`text-sm mb-4 ${isLightTheme ? 'text-slate-600' : 'text-slate-200'}`}>
          {TOUR_STEPS[step]}
        </p>

        <div className="flex items-center justify-between">
          <span className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-slate-400'}`}>
            {step + 1} / {TOUR_STEPS.length}
          </span>

          <button
            onClick={() => {
              if (step < TOUR_STEPS.length - 1) {
                setStep((value) => value + 1)
                return
              }

              onComplete()
            }}
            className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm text-white hover:bg-orange-600 transition-colors"
          >
            {step < TOUR_STEPS.length - 1 ? 'Next' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
