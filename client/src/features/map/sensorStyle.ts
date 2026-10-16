import type { SensorKind } from '../../../../shared/index.ts'
import type { PathOptions } from 'leaflet'

export const SENSOR_COLORS: Record<SensorKind, { fill: string; stroke: string; label: string }> = {
  wellintel: { fill: '#7c6ee6', stroke: '#4c3d9a', label: 'Wellntel Sensors' },
  other: { fill: '#f0c94d', stroke: '#b8860b', label: 'Other Sensors' },
  'usgs-wells': { fill: '#14b8a6', stroke: '#0f766e', label: 'USGS Wells' },
  'usgs-flow': { fill: '#38bdf8', stroke: '#0369a1', label: 'USGS Flow' },
  noaa: { fill: '#fb923c', stroke: '#c2410c', label: 'NOAA' },
  'state-api': { fill: '#f43f5e', stroke: '#be123c', label: 'State APIs' },
}

// Colors for the details panel and selected-sensor highlight.
// `accent` is the glow/ring/chart color; `strong` is a darker shade used behind white text.
export const PANEL_ACCENTS: Partial<Record<SensorKind, { accent: string; strong: string }>> = {
  wellintel: { accent: '#7c6ee6', strong: '#7c6ee6' },
  other: { accent: '#f0c94d', strong: '#b8860b' },
}

export function panelAccent(kind: SensorKind): { accent: string; strong: string } {
  return PANEL_ACCENTS[kind] ?? { accent: SENSOR_COLORS[kind].fill, strong: SENSOR_COLORS[kind].stroke }
}

export function sensorPathOptions(kind: SensorKind): PathOptions {
  const colors = SENSOR_COLORS[kind]
  return {
    color: colors.stroke,
    fillColor: colors.fill,
    fillOpacity: 0.9,
    weight: 2,
  }
}

