export type BasemapId =
  | 'topography'
  | 'streets'
  | 'aerial-labels'
  | 'aerial'
  | 'hydrography'
  | 'light'
  | 'dark'

export interface BasemapOption {
  id: BasemapId
  label: string
  url: string
  attribution: string
  labelsUrl?: string
}

const ESRI = 'Powered by Esri'
const USGS_HYDRO =
  'USGS The National Map: National Hydrography Dataset. Data refreshed September, 2026.v1.1'

export const BASEMAPS: BasemapOption[] = [
  {
    id: 'topography',
    label: 'Topography',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: `${ESRI} | ${USGS_HYDRO}`,
  },
  {
    id: 'streets',
    label: 'Base street map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
  },
  {
    id: 'aerial-labels',
    label: 'Aerial with labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl:
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
  },
  {
    id: 'aerial',
    label: 'Aerial without labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
  },
  {
    id: 'hydrography',
    label: 'Hydrography',
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/tile/{z}/{y}/{x}',
    attribution: USGS_HYDRO,
  },
  {
    id: 'light',
    label: 'Light',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
  },
]

export const DEFAULT_BASEMAP: BasemapId = 'topography'

export function findBasemap(id: BasemapId): BasemapOption {
  const found = BASEMAPS.find((item) => item.id === id)
  if (!found) throw new Error(`Unknown basemap: ${id}`)
  return found
}
