import { seed } from './readingCount.ts'

const INTERVAL_HOURS = [4, 6, 8, 12] as const

export type MonthlyWaterDepth = {
  date: string
  depthFt: number
}

function clampRangeStart(start: string, firstReadingAt?: string): number {
  let startMs = Date.parse(`${start}T00:00:00.000Z`)
  if (!Number.isFinite(startMs)) return Number.NaN
  if (firstReadingAt) {
    const firstMs = Date.parse(firstReadingAt)
    if (Number.isFinite(firstMs)) startMs = Math.max(startMs, firstMs)
  }
  return startMs
}

function clampRangeEnd(end: string, lastReadingAt?: string): number {
  let endMs = Date.parse(`${end}T23:59:59.999Z`)
  if (!Number.isFinite(endMs)) return Number.NaN
  endMs = Math.min(endMs, Date.now())
  if (lastReadingAt) {
    const lastMs = Date.parse(lastReadingAt)
    if (Number.isFinite(lastMs)) endMs = Math.min(endMs, lastMs)
  }
  return endMs
}

function monthKey(ms: number): string {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function readingDepth(baseFt: number, hashed: number, ms: number): number {
  const date = new Date(ms)
  const dayOfYear = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
    Date.UTC(date.getUTCFullYear(), 0, 0)) /
    86_400_000
  const phase = ((hashed % 628) / 100)
  const amplitude = Math.max(3, baseFt * 0.12)
  const seasonal = Math.sin((dayOfYear / 365) * Math.PI * 2 + phase) * amplitude
  const jitter = (((hashed ^ Math.floor(ms / 86_400_000)) % 1000) / 1000 - 0.5) * amplitude * 0.35
  return Math.max(0.5, Number((baseFt + seasonal + jitter).toFixed(2)))
}

export function monthlyWaterDepth(
  sensorId: string,
  start: string,
  end: string,
  lastReadingFt: number,
  lastReadingAt?: string,
  firstReadingAt?: string,
): MonthlyWaterDepth[] {
  const startMs = clampRangeStart(start, firstReadingAt)
  const endMs = clampRangeEnd(end, lastReadingAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) return []

  const hashed = seed(sensorId)
  const intervalMs = INTERVAL_HOURS[hashed % INTERVAL_HOURS.length] * 60 * 60 * 1000
  const offset = hashed % intervalMs
  const firstIndex = Math.ceil((startMs - offset) / intervalMs)
  let cursor = offset + firstIndex * intervalMs
  if (cursor > endMs) return []

  const buckets = new Map<string, { sum: number; count: number }>()
  while (cursor <= endMs) {
    const key = monthKey(cursor)
    const current = buckets.get(key) ?? { sum: 0, count: 0 }
    current.sum += readingDepth(lastReadingFt, hashed, cursor)
    current.count += 1
    buckets.set(key, current)
    cursor += intervalMs
  }

  return [...buckets.entries()].map(([date, { sum, count }]) => ({
    date,
    depthFt: Number((sum / count).toFixed(2)),
  }))
}
