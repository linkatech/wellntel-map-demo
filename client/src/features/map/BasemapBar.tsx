import { BASEMAPS, type BasemapId } from './basemaps.ts'

type BasemapBarProps = {
  value: BasemapId
  onChange: (id: BasemapId) => void
}

export function BasemapBar({ value, onChange }: BasemapBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800">
      {BASEMAPS.map((basemap) => (
        <label key={basemap.id} className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="radio"
            name="basemap"
            checked={value === basemap.id}
            onChange={() => onChange(basemap.id)}
          />
          {basemap.label}
        </label>
      ))}
    </div>
  )
}
