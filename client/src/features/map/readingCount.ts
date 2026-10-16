const INTERVAL_HOURS = [4, 6, 8, 12] as const

export function seed(id: string): number {
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function countReadingsInRange(
  sensorId: string,
  start: string,
  end: string,
  lastReadingAt?: string,
  firstReadingAt?: string,
): number {
  let startMs = Date.parse(`${start}T00:00:00.000Z`)
  let endMs = Date.parse(`${end}T23:59:59.999Z`)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) return 0

  if (firstReadingAt) {
    const firstMs = Date.parse(firstReadingAt)
    if (Number.isFinite(firstMs)) startMs = Math.max(startMs, firstMs)
  }

  endMs = Math.min(endMs, Date.now())
  if (lastReadingAt) {
    const lastMs = Date.parse(lastReadingAt)
    if (Number.isFinite(lastMs)) endMs = Math.min(endMs, lastMs)
  }
  if (endMs < startMs) return 0

  const hashed = seed(sensorId)
  const intervalMs = INTERVAL_HOURS[hashed % INTERVAL_HOURS.length] * 60 * 60 * 1000
  const offset = hashed % intervalMs
  const firstIndex = Math.ceil((startMs - offset) / intervalMs)
  const firstMs = offset + firstIndex * intervalMs
  if (firstMs > endMs) return 0
  return Math.floor((endMs - firstMs) / intervalMs) + 1
}

export function hasReadingsInRange(
  sensor: { id: string; firstReadingAt?: string; lastReadingAt?: string },
  start: string,
  end: string,
): boolean {
  return countReadingsInRange(sensor.id, start, end, sensor.lastReadingAt, sensor.firstReadingAt) > 0
}
