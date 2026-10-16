import type { SensorKind } from '../../../../shared/index.ts'
import { seed } from './readingCount.ts'

export const PING_COUNT = 6
export const PING_INTERVAL_MS = 10 * 60 * 1000

export type Ping = {
  at: number
  up: boolean
}

// Demo-only: share of pings that succeed for each source.
const UP_RATE: Partial<Record<SensorKind, number>> = {
  'usgs-wells': 95,
  'usgs-flow': 88,
  noaa: 80,
  'state-api': 65,
}

// Demo-only: fixed oldest-to-newest outcomes that override the generated ones.
const FIXED_PINGS: Partial<Record<SensorKind, boolean[]>> = {
  'usgs-wells': [true, false, true, true, false, true],
  'usgs-flow': [true, true, true, true, false, false],
}

/**
 * Returns the last hour of pings for a source, oldest first. Pings land on a
 * round 10 minute clock mark (:00, :10, :20 ...) and each outcome is derived from
 * the source and ping time, so the history stays stable between renders.
 */
export function sourcePings(kind: SensorKind, now: number): Ping[] {
  const latest = Math.floor(now / PING_INTERVAL_MS) * PING_INTERVAL_MS
  const upRate = UP_RATE[kind] ?? 90

  const fixed = FIXED_PINGS[kind]

  const pings: Ping[] = []
  for (let index = PING_COUNT - 1; index >= 0; index -= 1) {
    const at = latest - index * PING_INTERVAL_MS
    const up = fixed ? fixed[PING_COUNT - 1 - index] : seed(`${kind}:${at}`) % 100 < upRate
    pings.push({ at, up })
  }
  return pings
}

export function formatPingAge(at: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000))
  if (minutes < 1) return 'Just now'
  return `${minutes} min ago`
}
