import type { LayerFilter } from '../../../../shared/index.ts'
import { LAYER_OPTIONS } from './layerFilters.ts'
import { TimeRangeSelect } from './TimeRangeSelect.tsx'
import type { TimeRange } from './timeRange.ts'

type LayerStripeProps = {
  value: LayerFilter
  onChange: (id: LayerFilter) => void
  timeRange: TimeRange
  onTimeRangeChange: (value: TimeRange) => void
}

export function LayerStripe({ value, onChange, timeRange, onTimeRangeChange }: LayerStripeProps) {
  return (
    <div className="relative z-[1100] flex items-stretch bg-wellntel-blue">
      <TimeRangeSelect value={timeRange} onChange={onTimeRangeChange} />
      <div
        className="flex min-w-0 flex-1 divide-x-2 divide-white text-[12px]"
        role="radiogroup"
        aria-label="Sensor source"
      >
        {LAYER_OPTIONS.map((option) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? 'min-w-0 flex-1 px-1.5 py-2 text-center font-semibold leading-tight text-white bg-wellntel-orange'
                  : 'min-w-0 flex-1 px-1.5 py-2 text-center font-semibold leading-tight text-white bg-wellntel-blue hover:brightness-110'
              }
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
