import { useEffect, useRef, useState } from 'react'
import { CalendarDays, CalendarRange, Check, ChevronDown } from 'lucide-react'
import {
  compactPresetLabel,
  createTimeRange,
  formatIsoDate,
  rangeForPreset,
  YEAR_PRESETS,
  type TimeRange,
  type TimeRangePreset,
} from './timeRange.ts'

type TimeRangeSelectProps = {
  value: TimeRange
  onChange: (value: TimeRange) => void
}

export function TimeRangeSelect({ value, onChange }: TimeRangeSelectProps) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(value.start)
  const [draftEnd, setDraftEnd] = useState(value.end)
  const rootRef = useRef<HTMLDivElement>(null)
  const customPending = draftStart !== value.start || draftEnd !== value.end
  const customActive = value.preset === 'custom' || customPending
  const customValid = Boolean(draftStart && draftEnd && draftStart <= draftEnd)

  useEffect(() => {
    if (!open) return
    setDraftStart(value.start)
    setDraftEnd(value.end)
  }, [open, value.end, value.start])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function selectPreset(preset: Exclude<TimeRangePreset, 'custom'>) {
    onChange(createTimeRange(preset))
    setOpen(false)
  }

  function applyCustom() {
    if (!customValid) return
    onChange({ preset: 'custom', start: draftStart, end: draftEnd })
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0 border-r-2 border-white">
      <button
        type="button"
        className="flex h-full w-[9.25rem] items-center justify-between gap-1.5 bg-black/20 px-2.5 py-2 text-left text-[12px] font-semibold text-white hover:bg-black/30"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Time range"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="leading-tight">
          <span className="block">{compactPresetLabel(value.preset)}</span>
          <span className="block text-[10px] font-medium text-white/80">
            {formatIsoDate(value.start)} – {formatIsoDate(value.end)}
          </span>
        </span>
        <ChevronDown size={14} className={open ? 'shrink-0 rotate-180' : 'shrink-0'} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-[1200] mt-1.5 w-max overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl ring-1 ring-black/10"
          role="dialog"
          aria-label="Choose time range"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <CalendarRange size={15} className="text-wellntel-blue" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-wellntel-blue">Presets</p>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/90" role="listbox" aria-label="Time range presets">
            {YEAR_PRESETS.map((option) => {
              const selected = value.preset === option.id
              const span = rangeForPreset(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? 'flex w-full items-center justify-between bg-wellntel-blue px-3 py-1.5 text-left text-white'
                      : 'flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-800 hover:bg-slate-50'
                  }
                  onClick={() => selectPreset(option.id)}
                >
                  <span>
                    <span className="block text-[13px] font-semibold">{option.label}</span>
                    <span className={selected ? 'block text-[11px] text-white/80' : 'block text-[11px] text-slate-500'}>
                      {formatIsoDate(span.start)} – {formatIsoDate(span.end)}
                    </span>
                  </span>
                  {selected ? <Check size={15} className="shrink-0" /> : null}
                </button>
              )
            })}
          </div>

          <div
            className={
              customActive
                ? 'border-t border-wellntel-orange/30 bg-orange-50/80 px-3 py-3'
                : 'border-t border-slate-300/70 bg-slate-200/70 px-3 py-3'
            }
          >
            <div className="w-max">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-wellntel-blue" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-wellntel-blue">
                    Custom
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-wellntel-orange px-3 py-1 text-[12px] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!customValid}
                  onClick={applyCustom}
                >
                  Apply
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label className="time-range-field">
                  <span>Start</span>
                  <input
                    type="date"
                    aria-label="Start"
                    value={draftStart}
                    max={draftEnd}
                    onChange={(event) => setDraftStart(event.target.value)}
                  />
                </label>
                <label className="time-range-field">
                  <span>End</span>
                  <input
                    type="date"
                    aria-label="End"
                    value={draftEnd}
                    min={draftStart}
                    onChange={(event) => setDraftEnd(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
