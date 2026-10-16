import type { LayerFilter, SensorKind } from '../../../../shared/index.ts'

export const LAYER_OPTIONS: Array<{ id: LayerFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'wellintel', label: 'Wellntel Sensors' },
  { id: 'other', label: 'Other Sensors' },
  { id: 'usgs-wells', label: 'USGS Wells' },
  { id: 'usgs-flow', label: 'USGS Flow' },
  { id: 'noaa', label: 'NOAA' },
  { id: 'state-api', label: 'State APIs' },
]

export const POINT_KINDS: SensorKind[] = ['wellintel', 'other']
export const MESH_KINDS: SensorKind[] = ['usgs-wells', 'usgs-flow', 'noaa', 'state-api']

export function isPointLayer(layer: LayerFilter): layer is SensorKind {
  return layer !== 'all' && POINT_KINDS.includes(layer)
}

export function isMeshLayer(layer: LayerFilter): layer is SensorKind {
  return layer !== 'all' && MESH_KINDS.includes(layer)
}
