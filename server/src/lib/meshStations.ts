import type { Sensor, SensorKind } from '../../../shared/index.js'

function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function jitter(rand: () => number, lat: number, lng: number, spread: number): { lat: number; lng: number } {
  return {
    lat: lat + (rand() - 0.5) * spread,
    lng: lng + (rand() - 0.5) * spread * 1.4,
  }
}

function reading(rand: () => number, min: number, max: number): number {
  return Number((min + rand() * (max - min)).toFixed(1))
}

function hashId(id: string): number {
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// Even mix so each preset keeps a different set of stations.
const COVERAGE = [
  { firstReadingAt: '2024-01-01T00:00:00Z', lastReadingAt: '2026-10-16T12:00:00Z' },
  { firstReadingAt: '2026-01-01T00:00:00Z', lastReadingAt: '2026-09-30T18:00:00Z' },
  { firstReadingAt: '2025-01-01T00:00:00Z', lastReadingAt: '2025-08-31T18:00:00Z' },
  { firstReadingAt: '2026-10-01T00:00:00Z', lastReadingAt: '2026-10-16T12:00:00Z' },
  { firstReadingAt: '2025-10-01T00:00:00Z', lastReadingAt: '2026-09-30T18:00:00Z' },
] as const

function coverageFor(id: string): { firstReadingAt: string; lastReadingAt: string } {
  return COVERAGE[hashId(id) % COVERAGE.length] ?? COVERAGE[0]
}

const WELL_ANCHORS: Array<[number, number]> = [
  [36.2, -119.3],
  [33.4, -112.1],
  [35.2, -101.8],
  [37.7, -100.9],
  [40.6, -99.1],
  [41.3, -96.7],
  [32.8, -96.8],
  [30.3, -97.7],
  [29.8, -95.4],
  [35.5, -97.5],
  [39.7, -104.9],
  [40.6, -111.9],
  [43.6, -116.2],
  [47.0, -109.0],
  [46.9, -96.8],
  [44.0, -90.0],
  [41.6, -87.7],
  [39.1, -84.5],
  [33.7, -84.4],
  [28.5, -81.4],
  [30.4, -87.2],
  [36.1, -86.8],
  [38.6, -90.2],
  [39.0, -77.5],
  [42.9, -78.9],
  [40.4, -75.9],
  [35.8, -78.6],
  [34.0, -81.0],
  [32.3, -90.2],
  [36.7, -76.0],
  [61.22, -149.9],
  [64.84, -147.72],
  [58.3, -134.42],
  [60.54, -151.26],
  [64.5, -165.41],
]

const FLOW_ANCHORS: Array<[number, number, string]> = [
  [38.63, -90.18, 'Mississippi at St. Louis'],
  [32.3, -90.9, 'Mississippi at Vicksburg'],
  [29.95, -90.07, 'Mississippi at New Orleans'],
  [36.86, -111.59, 'Colorado at Lees Ferry'],
  [34.3, -114.14, 'Colorado at Parker'],
  [45.61, -121.17, 'Columbia at The Dalles'],
  [46.2, -119.1, 'Columbia at Richland'],
  [39.09, -84.51, 'Ohio at Cincinnati'],
  [38.25, -85.76, 'Ohio at Louisville'],
  [41.5, -81.7, 'Cuyahoga at Cleveland'],
  [38.9, -77.02, 'Potomac at Washington'],
  [37.53, -77.45, 'James at Richmond'],
  [32.78, -79.93, 'Cooper at Charleston'],
  [30.4, -91.2, 'Atchafalaya at Krotz Springs'],
  [44.98, -93.26, 'Mississippi at Minneapolis'],
  [41.26, -95.93, 'Missouri at Omaha'],
  [39.1, -94.58, 'Missouri at Kansas City'],
  [46.88, -96.77, 'Red River at Fargo'],
  [35.18, -114.57, 'Colorado at Laughlin'],
  [43.07, -89.4, 'Wisconsin at Madison'],
  [42.33, -83.05, 'Detroit River'],
  [40.45, -80.01, 'Ohio at Pittsburgh'],
  [36.16, -115.14, 'Las Vegas Wash'],
  [47.6, -122.33, 'Duwamish at Seattle'],
  [45.52, -122.67, 'Willamette at Portland'],
  [29.76, -95.37, 'Buffalo Bayou at Houston'],
  [32.78, -96.8, 'Trinity at Dallas'],
  [35.47, -97.52, 'Oklahoma River at OKC'],
  [33.75, -84.39, 'Chattahoochee at Atlanta'],
  [27.95, -82.46, 'Hillsborough at Tampa'],
  [61.22, -149.9, 'Ship Creek at Anchorage'],
  [64.79, -141.2, 'Yukon near Eagle'],
  [60.54, -151.27, 'Kenai at Soldotna'],
]

const NOAA_ANCHORS: Array<[number, number, string]> = [
  [29.31, -94.79, 'Galveston Pier 21'],
  [29.76, -95.0, 'Houston Ship Channel'],
  [27.8, -97.4, 'Corpus Christi'],
  [30.4, -88.9, 'Pascagoula'],
  [30.38, -87.2, 'Pensacola'],
  [27.95, -82.46, 'Tampa Bay'],
  [25.78, -80.18, 'Virginia Key'],
  [32.78, -79.93, 'Charleston Harbor'],
  [34.0, -77.9, 'Wilmington'],
  [36.9, -76.3, 'Sewells Point'],
  [38.87, -77.02, 'Washington Channel'],
  [39.27, -76.58, 'Baltimore'],
  [40.7, -74.02, 'The Battery'],
  [41.35, -72.09, 'New London'],
  [42.35, -71.05, 'Boston Harbor'],
  [43.65, -70.25, 'Portland ME'],
  [32.71, -117.17, 'San Diego Bay'],
  [33.72, -118.27, 'Los Angeles'],
  [37.81, -122.47, 'San Francisco'],
  [40.8, -124.16, 'Eureka'],
  [44.62, -124.05, 'Newport OR'],
  [46.2, -123.8, 'Astoria'],
  [47.6, -122.34, 'Seattle'],
  [48.5, -122.6, 'Port Townsend'],
  [30.27, -89.4, 'Waveland'],
  [29.12, -90.2, 'Grand Isle'],
  [26.1, -97.16, 'Port Isabel'],
  [35.2, -75.7, 'Cape Hatteras'],
  [41.5, -71.3, 'Newport RI'],
  [61.24, -149.89, 'Anchorage'],
  [57.05, -135.34, 'Sitka'],
  [55.34, -131.65, 'Ketchikan'],
  [53.89, -166.54, 'Dutch Harbor'],
  [60.54, -145.75, 'Cordova'],
]

const STATE_ANCHORS: Array<[number, number, string]> = [
  [35.37, -119.02, 'CA DWR Kern CASGEM'],
  [38.58, -121.49, 'CA DWR Sacramento'],
  [34.19, -101.7, 'TX TWDB High Plains'],
  [30.27, -97.74, 'TX TWDB Edwards'],
  [29.65, -81.65, 'FL SJRWMD 4212'],
  [27.8, -81.8, 'FL SFWMD'],
  [33.45, -111.94, 'AZ ADWR AMA'],
  [32.2, -110.97, 'AZ ADWR Tucson'],
  [39.74, -104.99, 'CO DWR Denver'],
  [40.6, -105.1, 'CO DWR Greeley'],
  [41.26, -96.0, 'NE DNR Platte'],
  [37.7, -97.3, 'KS WIZARD Equus'],
  [35.5, -97.5, 'OWRB Oklahoma'],
  [34.7, -92.3, 'AR ANRC Alluvial'],
  [32.3, -90.2, 'MS YMD Delta'],
  [30.5, -91.1, 'LA DOTD Baton Rouge'],
  [40.0, -89.0, 'IL ISWS Mahomet'],
  [43.0, -89.4, 'WI DNR Central Sands'],
  [44.9, -93.2, 'MN DNR Twin Cities'],
  [42.3, -83.7, 'MI EGLE Ann Arbor'],
  [40.0, -83.0, 'OH DNR Columbus'],
  [39.2, -86.5, 'IN DNR Bloomington'],
  [36.1, -86.8, 'TN EG Memphis'],
  [33.5, -86.8, 'AL GSA Birmingham'],
  [32.4, -84.0, 'GA EPD Clayton'],
  [35.9, -78.7, 'NC DWR Raleigh'],
  [34.0, -81.0, 'SC DNR Columbia'],
  [37.5, -77.4, 'VA DEQ Richmond'],
  [39.3, -76.6, 'MD MDE Baltimore'],
  [40.4, -76.9, 'PA DEP Harrisburg'],
  [42.7, -73.8, 'NY DEC Albany'],
  [40.2, -74.7, 'NJ DEP Trenton'],
  [41.8, -72.7, 'CT DPH Hartford'],
  [42.3, -71.8, 'MA DEP Worcester'],
  [43.2, -71.5, 'NH DES Concord'],
  [44.3, -69.8, 'ME DWP Augusta'],
  [44.0, -103.2, 'SD DANR Rapid City'],
  [46.8, -100.8, 'ND DWR Bismarck'],
  [45.8, -108.5, 'MT DNRC Billings'],
  [43.6, -116.2, 'ID WR Boise'],
  [47.0, -122.9, 'WA ECY Olympia'],
  [44.9, -123.0, 'OR WRD Salem'],
  [40.8, -111.9, 'UT DWRi Salt Lake'],
  [36.2, -115.1, 'NV DWR Las Vegas'],
  [35.1, -106.6, 'NM OSE Albuquerque'],
  [41.1, -104.8, 'WY SEO Cheyenne'],
  [61.22, -149.9, 'AK DNR Anchorage'],
  [64.84, -147.72, 'AK DNR Fairbanks'],
  [58.3, -134.42, 'AK DNR Juneau'],
]

function scatterAround(
  kind: SensorKind,
  anchors: Array<[number, number] | [number, number, string]>,
  count: number,
  seed: number,
  namer: (index: number, rand: () => number, anchorName?: string) => string,
): Sensor[] {
  const rand = rng(seed)
  const out: Sensor[] = []
  for (let i = 0; i < count; i++) {
    const anchor = anchors[i % anchors.length]
    if (!anchor) continue
    const point = jitter(rand, anchor[0], anchor[1], 1.8)
    const name = namer(i, rand, anchor[2])
    const id = `${kind}-${i + 1}`
    out.push({
      id,
      name,
      kind,
      lat: Number(point.lat.toFixed(4)),
      lng: Number(point.lng.toFixed(4)),
      lastReadingFt: reading(rand, 2, 180),
      ...coverageFor(id),
    })
  }
  return out
}

export const meshStations: Sensor[] = [
  ...scatterAround('usgs-wells', WELL_ANCHORS, 420, 11, (index) => `USGS Well ${3800 + index}`),
  ...scatterAround('usgs-flow', FLOW_ANCHORS, 310, 23, (index, _rand, anchorName) =>
    anchorName ? `USGS ${anchorName} #${index + 1}` : `USGS Flow ${index + 1}`,
  ),
  ...scatterAround('noaa', NOAA_ANCHORS, 240, 37, (index, _rand, anchorName) =>
    anchorName ? `NOAA ${anchorName} ${index + 1}` : `NOAA Station ${index + 1}`,
  ),
  ...scatterAround('state-api', STATE_ANCHORS, 360, 53, (index, _rand, anchorName) =>
    anchorName ? `${anchorName} ${index + 1}` : `State well ${index + 1}`,
  ),
]
