export type TimeRangePreset =
  | 'current-calendar'
  | 'last-calendar'
  | 'current-water'
  | 'last-water'
  | 'custom'

export type TimeRange = {
  preset: TimeRangePreset
  start: string
  end: string
}

export const TIME_RANGE_PRESETS: Array<{ id: TimeRangePreset; label: string }> = [
  { id: 'current-calendar', label: 'Current calendar year' },
  { id: 'last-calendar', label: 'Last calendar year' },
  { id: 'current-water', label: 'Current water year' },
  { id: 'last-water', label: 'Last water year' },
  { id: 'custom', label: 'Custom' },
]

export const YEAR_PRESETS = TIME_RANGE_PRESETS.filter(
  (item): item is { id: Exclude<TimeRangePreset, 'custom'>; label: string } => item.id !== 'custom',
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${Number(month)}/${Number(day)}/${year}`
}

/** USGS water year YYYY runs 1 Oct (YYYY-1) through 30 Sep YYYY. */
export function waterYearEndYear(at: Date): number {
  return at.getMonth() >= 9 ? at.getFullYear() + 1 : at.getFullYear()
}

export function rangeForPreset(preset: Exclude<TimeRangePreset, 'custom'>, at = new Date()): {
  start: string
  end: string
} {
  const year = at.getFullYear()
  if (preset === 'current-calendar') {
    return { start: toIsoDate(year, 0, 1), end: toIsoDate(year, 11, 31) }
  }
  if (preset === 'last-calendar') {
    return { start: toIsoDate(year - 1, 0, 1), end: toIsoDate(year - 1, 11, 31) }
  }
  const wy = waterYearEndYear(at)
  const endYear = preset === 'current-water' ? wy : wy - 1
  return { start: toIsoDate(endYear - 1, 9, 1), end: toIsoDate(endYear, 8, 30) }
}

export function createTimeRange(preset: TimeRangePreset, at = new Date()): TimeRange {
  if (preset === 'custom') {
    const current = rangeForPreset('current-calendar', at)
    return { preset, ...current }
  }
  return { preset, ...rangeForPreset(preset, at) }
}

export function presetLabel(preset: TimeRangePreset): string {
  return TIME_RANGE_PRESETS.find((item) => item.id === preset)?.label ?? 'Custom'
}

export function compactPresetLabel(preset: TimeRangePreset): string {
  if (preset === 'current-calendar') return 'Current CY'
  if (preset === 'last-calendar') return 'Last CY'
  if (preset === 'current-water') return 'Current WY'
  if (preset === 'last-water') return 'Last WY'
  return 'Custom'
}
