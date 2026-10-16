import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, ChevronDown, Info, MapPin, X } from 'lucide-react'
import type { LayerFilter, Sensor } from '../../../../shared/index.ts'
import { isMeshLayer, isPointLayer, MESH_KINDS } from './layerFilters.ts'
import { countReadingsInRange } from './readingCount.ts'
import { panelAccent, SENSOR_COLORS } from './sensorStyle.ts'
import { AllSummary } from './AllSummary.tsx'
import { SourceHealth } from './SourceHealth.tsx'
import { compactPresetLabel, type TimeRange } from './timeRange.ts'
import type { GridCell } from './usGrid.ts'
import { WaterDepthChart } from './WaterDepthChart.tsx'
import { monthlyWaterDepth } from './waterDepthSeries.ts'

type MapSidebarProps = {
  layer: LayerFilter
  locations: Sensor[]
  sensors: Sensor[]
  selectedId: string | null
  onSelect: (id: string) => void
  cell: GridCell | null
  checkedStationIds: ReadonlySet<string>
  onSetStationsChecked: (ids: string[], checked: boolean) => void
  onClearCell: () => void
  timeRange: TimeRange
  helpOpen?: boolean
  onHelpOpenChange?: (open: boolean) => void
  hasApiAccess?: boolean
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function LocationDetailsHelp({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const hoverTimer = useRef<number | null>(null)
  const ignoreIconClick = useRef(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLButtonElement>(null)
  const tailRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (!open || !iconRef.current || !tailRef.current) return
    const iconCenter = iconRef.current.offsetLeft + iconRef.current.offsetWidth / 2
    tailRef.current.style.left = `${iconCenter - 6}px`
  }, [open])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  // Make sure the page overlay doesn't linger if this help is removed while open.
  useEffect(() => () => onOpenChange?.(false), [onOpenChange])

  function clearHoverTimer() {
    if (hoverTimer.current != null) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }

  useEffect(() => () => clearHoverTimer(), [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (tooltipRef.current?.contains(event.target as Node)) return
      setOpen(false)
      ignoreIconClick.current = Boolean(iconRef.current?.contains(event.target as Node))
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

  return (
    <div
      className={
        open
          ? '-mx-2 -my-1 relative flex w-fit items-center gap-1.5 rounded-md bg-white px-2 py-1'
          : '-mx-2 -my-1 relative flex w-fit items-center gap-1.5 rounded-md px-2 py-1'
      }
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-wellntel-blue">
        Location Details
      </h2>
      <button
        ref={iconRef}
        type="button"
        className="rounded-full text-wellntel-blue hover:bg-wellntel-blue/10"
        aria-label="Location details help"
        aria-expanded={open}
        onMouseEnter={() => {
          clearHoverTimer()
          hoverTimer.current = window.setTimeout(() => setOpen(true), 1000)
        }}
        onMouseLeave={clearHoverTimer}
        onClick={() => {
          if (ignoreIconClick.current) {
            ignoreIconClick.current = false
            return
          }
          setOpen(true)
        }}
      >
        <Info size={14} />
      </button>

      {open ? (
        <div
          ref={tooltipRef}
          className="absolute left-0 top-full z-50 mt-2.5 w-[18rem] rounded-md bg-wellntel-orange px-3.5 py-3 pr-9 text-justify text-[14px] leading-snug text-white shadow-xl"
          role="tooltip"
        >
          <span
            ref={tailRef}
            aria-hidden="true"
            className="absolute -top-1.5 size-3 rotate-45 rounded-[2px] bg-wellntel-orange"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1.5 rounded-sm p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
            aria-label="Close help"
            onClick={() => setOpen(false)}
          >
            <X size={14} />
          </button>
          Select a location in the dropdown or on the map to see its details.
        </div>
      ) : null}
    </div>
  )
}

function LocationDropdown({
  label,
  locations,
  selected,
  onSelect,
}: {
  label: string
  locations: Sensor[]
  selected: Sensor | undefined
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  const none = locations.length === 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md bg-(--accent-strong) px-3 py-2 text-left text-[13px] font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-(--accent)/40 disabled:cursor-default disabled:hover:brightness-100"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Location"
        disabled={none}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? 'truncate' : 'truncate text-white/70'}>
          {none ? 'No locations in this time range' : (selected?.name ?? 'Select a location')}
        </span>
        <ChevronDown size={15} className={open ? 'shrink-0 rotate-180 text-white' : 'shrink-0 text-white'} />
      </button>

      {open && !none ? (
        <ul
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md bg-white py-1 shadow-xl ring-1 ring-(--accent)/25"
          role="listbox"
          aria-label={`${label} locations`}
        >
          {locations.map((location) => {
            const isSelected = location.id === selected?.id
            return (
              <li key={location.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={
                    isSelected
                      ? 'flex w-full items-center justify-between gap-2 bg-(--accent-strong) px-3 py-2 text-left text-[13px] font-medium text-white'
                      : 'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-slate-800 hover:bg-(--accent)/10'
                  }
                  onClick={() => {
                    onSelect(location.id)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{location.name}</span>
                  {isSelected ? <Check size={14} className="shrink-0" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function DetailChip({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md bg-(--accent)/30 px-2.5 py-1 text-[11px] ring-1 ring-(--accent)/40 ${className}`}
    >
      <span className="shrink-0 font-semibold uppercase tracking-wide text-(--accent-strong)">
        {label}
      </span>
      <span className="truncate font-medium text-slate-800">{value}</span>
    </span>
  )
}

function LocationCard({ sensor, readingCount }: { sensor: Sensor; readingCount: number }) {
  return (
    <article className="rounded-md border border-(--accent)/20 bg-(--accent)/10 p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="sensor-selected selected-well-swatch shrink-0" />
        <h3 className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{sensor.name}</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sensor.aquifer ? (
          <div className="flex basis-full gap-1.5">
            <DetailChip label="Aquifer" value={sensor.aquifer} className="min-w-0" />
          </div>
        ) : null}
        <div className="flex basis-full gap-1.5">
          {sensor.depthFt != null ? (
            <DetailChip label="Depth" value={`${sensor.depthFt} ft`} className="shrink-0" />
          ) : null}
          <DetailChip
            label="Lat / Lng"
            value={`${sensor.lat.toFixed(2)}, ${sensor.lng.toFixed(2)}`}
            className="min-w-0"
          />
        </div>
        <div className="flex basis-full gap-1.5">
          <DetailChip label="Readings" value={readingCount.toLocaleString('en-US')} className="shrink-0" />
          {sensor.lastReadingAt ? (
            <DetailChip label="Last" value={formatTimestamp(sensor.lastReadingAt)} className="min-w-0" />
          ) : null}
        </div>
      </div>
    </article>
  )
}

function fetchSourcePhrase(layer: LayerFilter): string {
  if (layer === 'all') return 'the selected sources through their APIs'
  return `the ${SENSOR_COLORS[layer].label} source through their API`
}

function FetchReadingsHelp({
  layer,
  onOpenChange,
  children,
}: {
  layer: LayerFilter
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const hoverTimer = useRef<number | null>(null)
  const ignoreIconClick = useRef(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLButtonElement>(null)
  const tailRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (!open || !iconRef.current || !tailRef.current || !tooltipRef.current) return
    const iconRect = iconRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const iconCenter = iconRect.left + iconRect.width / 2 - tooltipRect.left
    tailRef.current.style.left = `${iconCenter - 6}px`
  }, [open])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => () => onOpenChange?.(false), [onOpenChange])

  function clearHoverTimer() {
    if (hoverTimer.current != null) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }

  useEffect(() => () => clearHoverTimer(), [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (tooltipRef.current?.contains(event.target as Node)) return
      setOpen(false)
      ignoreIconClick.current = Boolean(iconRef.current?.contains(event.target as Node))
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

  return (
    <div
      className={
        open
          ? '-mx-2 -my-1 relative z-[2100] flex w-fit items-center gap-1.5 rounded-md bg-white px-2 py-1'
          : 'relative flex w-fit items-center gap-1.5'
      }
    >
      {children}
      <button
        ref={iconRef}
        type="button"
        className="rounded-full text-wellntel-blue hover:bg-wellntel-blue/10"
        aria-label="Fetch readings help"
        aria-expanded={open}
        onMouseEnter={() => {
          clearHoverTimer()
          hoverTimer.current = window.setTimeout(() => setOpen(true), 1000)
        }}
        onMouseLeave={clearHoverTimer}
        onClick={() => {
          if (ignoreIconClick.current) {
            ignoreIconClick.current = false
            return
          }
          setOpen(true)
        }}
      >
        <Info size={14} />
      </button>

      {open ? (
        <div
          ref={tooltipRef}
          className="absolute left-0 bottom-full z-50 mb-2.5 w-[18.5rem] rounded-md bg-wellntel-orange px-3.5 py-3 pr-9 text-justify text-[13px] leading-snug text-white shadow-xl"
          role="tooltip"
        >
          <span
            ref={tailRef}
            aria-hidden="true"
            className="absolute -bottom-1.5 size-3 rotate-45 rounded-[2px] bg-wellntel-orange"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1.5 rounded-sm p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
            aria-label="Close help"
            onClick={() => setOpen(false)}
          >
            <X size={14} />
          </button>
          <p>
            This is a fetch to {fetchSourcePhrase(layer)}. When the data is brought in, you will be
            able to use it in the Level and Build tabs.
          </p>
          <p className="mt-2 italic">
            * These sources are external services and sometimes might be unavailable. Check the
            Source Health section below for more details.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function FetchReadingsButton({
  emptySelection,
  hasApiAccess,
}: {
  emptySelection: boolean
  hasApiAccess: boolean
}) {
  const locked = !hasApiAccess

  return (
    <div className="group/fetch relative w-fit">
      <button
        type="button"
        className="rounded-md bg-wellntel-orange px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:cursor-default disabled:bg-slate-300 disabled:hover:brightness-100"
        disabled={locked || emptySelection}
      >
        Fetch readings
      </button>
      {locked ? (
        <>
          <span className="absolute -right-2 -top-2 rounded bg-amber-500 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-white shadow">
            Premium
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-52 rounded-md bg-slate-800 px-2.5 py-2 text-[11px] font-medium leading-snug text-white shadow-lg group-hover/fetch:block"
          >
            This is a paid feature. Contact Wellntel support for more info.
          </span>
        </>
      ) : null}
    </div>
  )
}

function CellStations({
  cell,
  layer,
  checkedStationIds,
  onSetStationsChecked,
  onClose,
  onHelpOpenChange,
  hasApiAccess,
}: {
  cell: GridCell
  layer: LayerFilter
  checkedStationIds: ReadonlySet<string>
  onSetStationsChecked: (ids: string[], checked: boolean) => void
  onClose: () => void
  onHelpOpenChange?: (open: boolean) => void
  hasApiAccess: boolean
}) {
  const groups = MESH_KINDS.map((kind) => ({
    kind,
    stations: cell.stations
      .filter((station) => station.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.stations.length > 0)

  const total = cell.stations.length
  const checkedCount = cell.stations.filter((station) => checkedStationIds.has(station.id)).length
  const bulkButtonClass =
    'rounded-md border border-wellntel-blue/35 bg-white px-2 py-px text-[12px] font-medium leading-tight text-wellntel-blue hover:bg-wellntel-blue/10 disabled:cursor-default disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-70 disabled:hover:bg-white'

  return (
    <div className="relative flex flex-col gap-4 text-slate-800">
      <button
        type="button"
        className="absolute right-0 top-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Close cell"
        onClick={onClose}
      >
        <X size={14} />
      </button>

      {total === 0 ? (
        <p className="pr-6 text-[13px] text-slate-500">No locations in this cell for this time range.</p>
      ) : null}

      {groups.map((group) => {
        const ids = group.stations.map((station) => station.id)
        const groupChecked = ids.filter((id) => checkedStationIds.has(id)).length
        return (
        <section key={group.kind} className="flex flex-col gap-1.5">
          <h3 className="pr-6 text-[14px] font-bold text-slate-800">{SENSOR_COLORS[group.kind].label}</h3>
          <div className="-ml-1.5 flex items-center gap-1">
            <button
              type="button"
              className={bulkButtonClass}
              disabled={groupChecked === ids.length}
              onClick={() => onSetStationsChecked(ids, true)}
            >
              Select all
            </button>
            <button
              type="button"
              className={bulkButtonClass}
              disabled={groupChecked === 0}
              onClick={() => onSetStationsChecked(ids, false)}
            >
              Clear all
            </button>
          </div>
          <ul className="h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5">
            {group.stations.map((station) => (
              <li key={station.id}>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
                  <input
                    type="checkbox"
                    className="mt-px block size-3.5 shrink-0 accent-(--accent-strong)"
                    checked={checkedStationIds.has(station.id)}
                    onChange={(event) => onSetStationsChecked([station.id], event.target.checked)}
                  />
                  <span className="truncate" title={station.name}>
                    {station.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        )
      })}

      {total > 0 ? (
        <div className="-mt-2 flex flex-col items-start gap-2">
          <p className="text-[12px] text-slate-500">
            {checkedCount} of {total} {total === 1 ? 'location' : 'locations'} selected
          </p>
          <FetchReadingsHelp layer={layer} onOpenChange={onHelpOpenChange}>
            <FetchReadingsButton emptySelection={checkedCount === 0} hasApiAccess={hasApiAccess} />
          </FetchReadingsHelp>
        </div>
      ) : null}
    </div>
  )
}

export function MapSidebar({
  layer,
  locations,
  sensors,
  selectedId,
  onSelect,
  cell,
  checkedStationIds,
  onSetStationsChecked,
  onClearCell,
  timeRange,
  helpOpen = false,
  onHelpOpenChange,
  hasApiAccess = true,
}: MapSidebarProps) {
  const allLayerActive = layer === 'all'
  const pointLayerActive = isPointLayer(layer)
  const meshLayerActive = isMeshLayer(layer)
  const colors = panelAccent(layer === 'all' ? 'wellintel' : layer)
  const selected = locations.find((location) => location.id === selectedId)
  const readingCount = selected
    ? countReadingsInRange(
        selected.id,
        timeRange.start,
        timeRange.end,
        selected.lastReadingAt,
        selected.firstReadingAt,
      )
    : 0
  const depthSeries = selected
    ? monthlyWaterDepth(
        selected.id,
        timeRange.start,
        timeRange.end,
        selected.lastReadingFt ?? selected.depthFt ?? 20,
        selected.lastReadingAt,
        selected.firstReadingAt,
      )
    : []

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label="Location details"
      style={{ '--accent': colors.accent, '--accent-strong': colors.strong } as CSSProperties}
    >
      <div
        className={
          helpOpen
            ? 'relative z-[2100] border-b border-transparent px-4 py-3'
            : 'relative z-20 border-b border-slate-200 px-4 py-3'
        }
      >
        {pointLayerActive ? (
          <LocationDetailsHelp onOpenChange={onHelpOpenChange} />
        ) : (
          <div className="flex items-baseline gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-wellntel-blue">
              {allLayerActive ? 'Network Summary' : 'Location Details'}
            </h2>
            {allLayerActive ? (
              <span className="text-[11px] text-slate-500">{compactPresetLabel(timeRange.preset)}</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {allLayerActive ? (
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
            <AllSummary
              sensors={sensors}
              timeRange={timeRange}
              onHelpOpenChange={onHelpOpenChange}
            />
          </div>
        ) : pointLayerActive ? (
          <>
            <div className="shrink-0 px-4 pt-3">
              <LocationDropdown
                label={SENSOR_COLORS[layer].label}
                locations={locations}
                selected={selected}
                onSelect={onSelect}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
              {selected ? (
                <div className="flex flex-col gap-3">
                  <LocationCard sensor={selected} readingCount={readingCount} />
                  <WaterDepthChart
                    series={depthSeries}
                    color={colors.accent}
                    traceColor={colors.strong}
                    labelColor={colors.strong}
                  />
                </div>
              ) : (
                <p className="flex items-start gap-2 text-[13px] text-slate-500">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                  {locations.length === 0
                    ? 'No locations have readings in this time range.'
                    : 'Choose a location to see its details.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3 text-[13px] text-slate-500">
            {cell ? (
              <CellStations
                cell={cell}
                layer={layer}
                checkedStationIds={checkedStationIds}
                onSetStationsChecked={onSetStationsChecked}
                onClose={onClearCell}
                onHelpOpenChange={onHelpOpenChange}
                hasApiAccess={hasApiAccess}
              />
            ) : (
              'Select a cell on the map to see its locations.'
            )}
          </div>
        )}

      </div>

      {meshLayerActive ? <SourceHealth kind={layer} onHelpOpenChange={onHelpOpenChange} /> : null}
    </aside>
  )
}
