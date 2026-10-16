/** Public path on demos.linkatechdevs.com. Express origin still serves at `/`. */
export const PUBLIC_BASE_PATH = '/wellntel/map-services-and-meta'

export type SensorKind = 'wellintel' | 'other' | 'usgs-wells' | 'usgs-flow' | 'noaa' | 'state-api'

export type LayerFilter = SensorKind | 'all'

export interface Sensor {
  id: string
  name: string
  kind: SensorKind
  lat: number
  lng: number
  aquifer?: string
  depthFt?: number
  lastReadingFt?: number
  /** First stored reading. Locations with no overlap in the selected range are hidden. */
  firstReadingAt?: string
  lastReadingAt?: string
}

export interface SensorsResponse {
  sensors: Sensor[]
}

export interface HealthResponse {
  ok: true
  service: string
  appPublicUrl: string
  clientOrigin: string
}
