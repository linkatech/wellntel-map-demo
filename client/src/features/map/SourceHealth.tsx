import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import type { SensorKind } from '../../../../shared/index.ts'
import { SENSOR_COLORS } from './sensorStyle.ts'
import { formatPingAge, sourcePings } from './sourceHealth.ts'

function formatPingTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function SourceHealthHelp({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
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
        Source Health
      </h2>
      <button
        ref={iconRef}
        type="button"
        className="rounded-full text-wellntel-blue hover:bg-wellntel-blue/10"
        aria-label="Source health help"
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
          className="absolute bottom-full left-0 z-50 mb-2.5 w-[18rem] rounded-md bg-wellntel-orange px-3.5 py-3 pr-9 text-justify text-[13px] leading-snug text-white shadow-xl"
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
          The circles show the periodic pings we ran every 10 minutes over the last hour. Green
          stands for service up, red for service down. Hover them for more details.
        </div>
      ) : null}
    </div>
  )
}

export function SourceHealth({
  kind,
  onHelpOpenChange,
}: {
  kind: SensorKind
  onHelpOpenChange?: (open: boolean) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const [helpOpen, setHelpOpen] = useState(false)
  const handleHelpOpenChange = useCallback(
    (open: boolean) => {
      setHelpOpen(open)
      onHelpOpenChange?.(open)
    },
    [onHelpOpenChange],
  )

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const pings = useMemo(() => sourcePings(kind, now), [kind, now])
  const lastPing = pings[pings.length - 1]
  return (
    <section
      className={
        helpOpen
          ? 'relative z-[2100] shrink-0 border-t border-transparent bg-white px-4 py-3'
          : 'relative shrink-0 border-t border-slate-200 bg-white px-4 py-3'
      }
      aria-label="Source health"
    >
      <div className="mb-3">
        <SourceHealthHelp onOpenChange={handleHelpOpenChange} />
      </div>

      <article className="rounded-md border border-(--accent)/20 bg-(--accent)/10 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
            {SENSOR_COLORS[kind].label}
          </h3>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <span
              className={
                lastPing.up
                  ? 'inline-flex items-center gap-1 rounded-full bg-green-600 py-0.5 pl-1.5 pr-2 font-bold uppercase text-white'
                  : 'inline-flex items-center gap-1 rounded-full bg-red-600 py-0.5 pl-1.5 pr-2 font-bold uppercase text-white'
              }
            >
              {lastPing.up ? (
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              ) : (
                <TriangleAlert size={12} strokeWidth={2.5} aria-hidden="true" />
              )}
              {lastPing.up ? 'Up' : 'Down'}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <ul className="flex shrink-0 items-center gap-1.5" aria-label="Pings over the last hour">
            {pings.map((ping) => (
              <li
                key={ping.at}
                className="group relative"
                aria-label={`${ping.up ? 'Up' : 'Down'} at ${formatPingTime(ping.at)}`}
              >
                <span
                  className={
                    ping.up
                      ? 'block size-2.5 rounded-full bg-green-500'
                      : 'block size-2.5 rounded-full bg-red-500'
                  }
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-[1100] mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-slate-800"
                  />
                  <span className={ping.up ? 'font-bold text-green-400' : 'font-bold text-red-400'}>
                    {ping.up ? 'UP' : 'DOWN'}
                  </span>
                  {' · '}
                  {formatPingTime(ping.at)}
                </span>
              </li>
            ))}
          </ul>

          <p
            className="flex min-w-0 items-center gap-1.5 text-[11px]"
            title={`Last ping at ${formatPingTime(lastPing.at)}`}
          >
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              Last ping
            </span>
            <span className="truncate font-medium text-slate-800">
              {formatPingAge(lastPing.at, now)}
            </span>
          </p>
        </div>
      </article>
    </section>
  )
}
