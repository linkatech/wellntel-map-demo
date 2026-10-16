import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import type { Sensor, SensorKind } from '../../../../shared/index.ts'
import { MESH_KINDS, POINT_KINDS } from './layerFilters.ts'
import { countReadingsInRange } from './readingCount.ts'
import { SENSOR_COLORS } from './sensorStyle.ts'
import { formatPingAge, sourcePings } from './sourceHealth.ts'
import type { TimeRange } from './timeRange.ts'

const SOURCE_KINDS: SensorKind[] = [...POINT_KINDS, ...MESH_KINDS]
const REGIONS = [
  'West Coast',
  'Southwest',
  'Mountain West',
  'Great Plains',
  'Midwest',
  'South',
  'East Coast',
  'Alaska',
  'Hawaii',
] as const

type RegionName = (typeof REGIONS)[number]

// Rough US regions from lat/lng — the names people actually use, not census divisions.
function regionOf(lat: number, lng: number): RegionName {
  if (lat < 24 && lng < -150) return 'Hawaii'
  if (lng > 0 || lat > 50 || lng < -129) return 'Alaska'
  if (lng <= -116.5) return 'West Coast'
  if (lng < -103 && lat < 37) return 'Southwest'
  if (lng < -103) return 'Mountain West'
  if (lng < -94 && (lat >= 36 || (lat >= 33 && lng < -100))) return 'Great Plains'
  if (lng >= -79.5) return 'East Coast'
  if (lat >= 37) return 'Midwest'
  return 'South'
}

function summarize(sensors: Sensor[], timeRange: TimeRange) {
  const byKind = Object.fromEntries(SOURCE_KINDS.map((kind) => [kind, 0])) as Record<SensorKind, number>
  const byRegion = Object.fromEntries(REGIONS.map((region) => [region, 0])) as Record<RegionName, number>
  let wellntelReadings = 0
  let otherReadings = 0

  for (const sensor of sensors) {
    byKind[sensor.kind] += 1
    if (sensor.kind === 'wellintel' || sensor.kind === 'other') {
      const readings = countReadingsInRange(
        sensor.id,
        timeRange.start,
        timeRange.end,
        sensor.lastReadingAt,
        sensor.firstReadingAt,
      )
      if (sensor.kind === 'wellintel') wellntelReadings += readings
      else otherReadings += readings
    }
    byRegion[regionOf(sensor.lat, sensor.lng)] += 1
  }

  return { byKind, byRegion, wellntelReadings, otherReadings, total: sensors.length }
}

function SplitCount({
  label,
  count,
  swatch,
  onDark = false,
}: {
  label: string
  count: number
  swatch: string
  onDark?: boolean
}) {
  return (
    <span
      className={
        onDark
          ? 'flex items-baseline gap-1.5 text-[11px] text-white/80'
          : 'flex items-baseline gap-1.5 text-[11px] text-slate-600'
      }
    >
      <span className="size-1.5 shrink-0 self-center rounded-full" style={{ background: swatch }} />
      <span>{label}</span>
      <span
        className={
          onDark
            ? 'font-semibold tabular-nums text-white'
            : 'font-semibold tabular-nums text-slate-800'
        }
      >
        {count.toLocaleString('en-US')}
      </span>
    </span>
  )
}

function HostedReadingsHelp({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
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
    <span className={open ? 'relative z-[2100]' : 'relative'}>
      <button
        ref={iconRef}
        type="button"
        className="rounded-full text-white hover:bg-white/15"
        aria-label="Hosted readings help"
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
        <Info size={12} />
      </button>

      {open ? (
        <div
          ref={tooltipRef}
          className="absolute left-0 top-full z-50 mt-2 w-[12.5rem] rounded-md bg-wellntel-orange px-3 py-2 pr-8 text-[12px] leading-snug text-white shadow-xl"
          role="tooltip"
        >
          <span
            ref={tailRef}
            aria-hidden="true"
            className="absolute -top-1.5 size-3 rotate-45 rounded-[2px] bg-wellntel-orange"
          />
          <button
            type="button"
            className="absolute right-1 top-1 rounded-sm p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
            aria-label="Close help"
            onClick={() => setOpen(false)}
          >
            <X size={12} />
          </button>
          stored in Wellntel databases
        </div>
      ) : null}
    </span>
  )
}

function HostedSplitCard({
  label,
  wellntel,
  other,
  className = '',
  help = false,
  onHelpOpenChange,
}: {
  label: string
  wellntel: number
  other: number
  className?: string
  help?: boolean
  onHelpOpenChange?: (open: boolean) => void
}) {
  return (
    <article className={`rounded-md border border-wellntel-blue bg-wellntel-blue px-3 py-2.5 shadow-sm ${className}`}>
      <p className="flex items-baseline gap-2">
        <span className="text-[22px] font-bold leading-none tabular-nums text-white">
          {(wellntel + other).toLocaleString('en-US')}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {label}
          {help ? <HostedReadingsHelp onOpenChange={onHelpOpenChange} /> : null}
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        <SplitCount label="Wellntel" count={wellntel} swatch={SENSOR_COLORS.wellintel.fill} onDark />
        <SplitCount label="Other" count={other} swatch={SENSOR_COLORS.other.fill} onDark />
      </div>
    </article>
  )
}

function CountRow({
  label,
  count,
  max,
  swatch,
  alt = false,
}: {
  label: string
  count: number
  max: number
  swatch?: string
  alt?: boolean
}) {
  const width = max > 0 ? Math.max(count > 0 ? 6 : 0, (count / max) * 100) : 0
  return (
    <div className={alt ? 'bg-white px-3 py-2' : 'bg-wellntel-blue/10 px-3 py-2'}>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
          {swatch ? (
            <span className="size-2 shrink-0 rounded-full" style={{ background: swatch }} />
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
          {count.toLocaleString('en-US')}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-wellntel-blue" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function ServiceRow({ kind, now }: { kind: SensorKind; now: number }) {
  const pings = sourcePings(kind, now)
  const last = pings[pings.length - 1]
  const up = last?.up ?? false

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-700">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: SENSOR_COLORS[kind].fill }}
        />
        <span className="truncate">{SENSOR_COLORS[kind].label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={
            up
              ? 'inline-flex items-center gap-0.5 rounded-full bg-green-600 py-px pl-1 pr-1.5 text-[10px] font-bold uppercase text-white'
              : 'inline-flex items-center gap-0.5 rounded-full bg-red-600 py-px pl-1 pr-1.5 text-[10px] font-bold uppercase text-white'
          }
        >
          {up ? (
            <Check size={10} strokeWidth={3} aria-hidden="true" />
          ) : (
            <TriangleAlert size={10} strokeWidth={2.5} aria-hidden="true" />
          )}
          {up ? 'Up' : 'Down'}
        </span>
        {last ? (
          <span className="text-[10px] text-slate-500">{formatPingAge(last.at, now)}</span>
        ) : null}
      </span>
    </li>
  )
}

export function AllSummary({
  sensors,
  timeRange,
  onHelpOpenChange,
}: {
  sensors: Sensor[]
  timeRange: TimeRange
  onHelpOpenChange?: (open: boolean) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const stats = useMemo(() => summarize(sensors, timeRange), [sensors, timeRange])
  const regionMax = Math.max(1, ...REGIONS.map((region) => stats.byRegion[region]))
  const sourceMax = Math.max(1, ...SOURCE_KINDS.map((kind) => stats.byKind[kind]))
  const upCount = MESH_KINDS.filter((kind) => {
    const pings = sourcePings(kind, now)
    return pings[pings.length - 1]?.up
  }).length

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-4 text-slate-800">
      <div className="grid grid-cols-2 gap-2">
        <HostedSplitCard
          className="col-span-2"
          label="Hosted sensors"
          wellntel={stats.byKind.wellintel}
          other={stats.byKind.other}
        />
        <HostedSplitCard
          className="col-span-2"
          label="Hosted readings"
          wellntel={stats.wellntelReadings}
          other={stats.otherReadings}
          help
          onHelpOpenChange={onHelpOpenChange}
        />
      </div>

      <section>
        <div className="overflow-hidden rounded-md border border-wellntel-blue">
          <h3 className="flex items-baseline gap-2 bg-wellntel-blue px-3 py-2.5">
            <span className="text-[22px] font-bold leading-none tabular-nums text-white">
              {stats.total.toLocaleString('en-US')}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
              Locations
            </span>
          </h3>
          {SOURCE_KINDS.map((kind, index) => (
            <CountRow
              key={kind}
              label={SENSOR_COLORS[kind].label}
              count={stats.byKind[kind]}
              max={sourceMax}
              swatch={SENSOR_COLORS[kind].fill}
              alt={index % 2 === 1}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-md border border-wellntel-blue">
          <h3 className="bg-wellntel-blue px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Wells/stations by region
          </h3>
          {REGIONS.map((region, index) => (
            <CountRow
              key={region}
              label={region}
              count={stats.byRegion[region]}
              max={regionMax}
              alt={index % 2 === 1}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-md border border-wellntel-blue">
          <h3 className="flex items-baseline justify-between gap-2 bg-wellntel-blue px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
              Services
            </span>
            <span className="shrink-0 text-right text-[11px] text-white/80">
              {upCount} of {MESH_KINDS.length} external sources up
            </span>
          </h3>
          <ul className="px-3 py-1.5">
            {MESH_KINDS.map((kind) => (
              <ServiceRow key={kind} kind={kind} now={now} />
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
