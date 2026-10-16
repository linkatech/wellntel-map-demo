import polygonClipping from 'polygon-clipping'
import type { LatLngExpression } from 'leaflet'
import type { Sensor } from '../../../../shared/index.ts'
import usa from './data/usa.json'

type LngLat = [number, number]
type Ring = LngLat[]
type PolygonCoords = Ring[]
type MultiPolygonCoords = PolygonCoords[]
type RegionId = 'conus' | 'alaska' | 'alaska-east' | 'hawaii'

export type GridCell = {
  id: string
  south: number
  west: number
  north: number
  east: number
  parts: LatLngExpression[][][]
  stations: Sensor[]
}

const REGION_IDS: RegionId[] = ['conus', 'alaska', 'alaska-east', 'hawaii']
const CONUS_CANDIDATE_TARGET = 345

function mercX(lng: number): number {
  return (lng * Math.PI) / 180
}

function mercY(lat: number): number {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

function fromMercX(x: number): number {
  return (x * 180) / Math.PI
}

function fromMercY(y: number): number {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI
}

function classify(lng: number, lat: number): RegionId {
  if (lat < 24 && lng < -150) return 'hawaii'
  if (lng > 0) return 'alaska-east'
  if (lat > 50 || lng < -129) return 'alaska'
  return 'conus'
}

function ensureClosed(ring: Ring): Ring {
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!first || !last) return ring
  if (first[0] === last[0] && first[1] === last[1]) return ring
  return [...ring, [first[0], first[1]]]
}

function bboxOf(polygons: MultiPolygonCoords): { south: number; west: number; north: number; east: number } | null {
  let south = 90
  let north = -90
  let west = 180
  let east = -180
  let any = false

  for (const polygon of polygons) {
    const outer = polygon[0]
    if (!outer) continue
    for (const position of outer) {
      const lng = position[0]
      const lat = position[1]
      if (lng == null || lat == null) continue
      any = true
      if (lat < south) south = lat
      if (lat > north) north = lat
      if (lng < west) west = lng
      if (lng > east) east = lng
    }
  }

  return any ? { south, west, north, east } : null
}

function cellAsMultiPolygon(south: number, west: number, north: number, east: number): MultiPolygonCoords {
  return [
    [
      ensureClosed([
        [west, south],
        [east, south],
        [east, north],
        [west, north],
      ]),
    ],
  ]
}

function toLeaflet(multi: MultiPolygonCoords): LatLngExpression[][][] {
  return multi.map((polygon) =>
    polygon.map((ring) =>
      ring.map((position) => {
        const lng = position[0]
        const lat = position[1]
        if (lng == null || lat == null) throw new Error('Invalid clipped ring')
        return [lat, lng]
      }),
    ),
  )
}

function clipCell(
  south: number,
  west: number,
  north: number,
  east: number,
  land: MultiPolygonCoords,
): LatLngExpression[][][] {
  try {
    const clipped = polygonClipping.intersection(land, cellAsMultiPolygon(south, west, north, east))
    if (!clipped.length) return []
    return toLeaflet(clipped as MultiPolygonCoords)
  } catch {
    return []
  }
}

function collectRegions(): Record<RegionId, MultiPolygonCoords> {
  const regions: Record<RegionId, MultiPolygonCoords> = {
    conus: [],
    alaska: [],
    'alaska-east': [],
    hawaii: [],
  }

  for (const feature of usa.features) {
    const { geometry } = feature
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

    for (const polygon of polygons) {
      const outer = polygon[0]
      if (!outer?.length) continue
      let lngSum = 0
      let latSum = 0
      let count = 0
      const last = outer.length > 1 ? outer.length - 1 : outer.length
      for (let i = 0; i < last; i++) {
        const position = outer[i]
        if (!position || position[0] == null || position[1] == null) continue
        lngSum += position[0]
        latSum += position[1]
        count++
      }
      if (count === 0) continue
      regions[classify(lngSum / count, latSum / count)].push(polygon as PolygonCoords)
    }
  }

  return regions
}

function buildLandCells(): Array<Omit<GridCell, 'stations'>> {
  const regions = collectRegions()
  const cells: Array<Omit<GridCell, 'stations'>> = []
  const conusBox = bboxOf(regions.conus)
  if (!conusBox) return cells

  const conusWidth = mercX(conusBox.east) - mercX(conusBox.west)
  const conusHeight = mercY(conusBox.north) - mercY(conusBox.south)
  if (conusWidth <= 0 || conusHeight <= 0) return cells
  const cellSize = Math.sqrt((conusWidth * conusHeight) / CONUS_CANDIDATE_TARGET)

  for (const id of REGION_IDS) {
    const land = regions[id]
    const box = bboxOf(land)
    if (!box) continue
    const xWest = mercX(box.west)
    const xEast = mercX(box.east)
    const ySouth = mercY(box.south)
    const yNorth = mercY(box.north)
    const width = xEast - xWest
    const height = yNorth - ySouth
    if (width <= 0 || height <= 0) continue

    const cols = Math.max(1, Math.ceil(width / cellSize))
    const rows = Math.max(1, Math.ceil(height / cellSize))

    for (let row = 0; row < rows; row++) {
      const y0 = ySouth + row * cellSize
      const y1 = y0 + cellSize
      if (y0 >= yNorth) break
      for (let col = 0; col < cols; col++) {
        const x0 = xWest + col * cellSize
        const x1 = x0 + cellSize
        if (x0 >= xEast) break
        const west = fromMercX(Math.max(x0, xWest))
        const east = fromMercX(Math.min(x1, xEast))
        const south = fromMercY(Math.max(y0, ySouth))
        const north = fromMercY(Math.min(y1, yNorth))
        if (east <= west || north <= south) continue
        const parts = clipCell(south, west, north, east, land)
        if (parts.length === 0) continue
        cells.push({
          id: `${id}-${row}-${col}`,
          south,
          west,
          north,
          east,
          parts,
        })
      }
    }
  }

  return cells
}

const LAND_CELLS = buildLandCells()

export function buildUsGrid(stations: Sensor[]): GridCell[] {
  const cells: GridCell[] = LAND_CELLS.map((cell) => ({ ...cell, stations: [] }))

  for (const station of stations) {
    const cell = cells.find(
      (item) =>
        station.lat >= item.south &&
        station.lat <= item.north &&
        station.lng >= item.west &&
        station.lng <= item.east,
    )
    if (cell) cell.stations.push(station)
  }

  return cells
}
