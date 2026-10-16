import type { SensorKind } from '../../../../shared/index.ts'
import { MESH_KINDS } from './layerFilters.ts'
import { SENSOR_COLORS } from './sensorStyle.ts'

type MapLegendProps = {
  kinds: SensorKind[]
}

export function MapLegend({ kinds }: MapLegendProps) {
  if (kinds.length === 0) return null

  return (
    <div className="absolute right-3 bottom-8 z-[1000] rounded-md border border-slate-300 bg-white/95 px-3 py-2 text-[13px] shadow-md">
      {kinds.map((kind) => {
        const colors = SENSOR_COLORS[kind]
        const mesh = MESH_KINDS.includes(kind)
        return (
          <div key={kind} className="flex items-center gap-2 py-0.5">
            <span
              className={mesh ? 'inline-block h-3 w-3' : 'inline-block h-3.5 w-3.5 rounded-full'}
              style={{ background: colors.fill, border: `2px solid ${colors.stroke}` }}
            />
            {colors.label}
            {mesh ? <span className="text-[11px] text-slate-500">grid</span> : null}
          </div>
        )
      })}
    </div>
  )
}
