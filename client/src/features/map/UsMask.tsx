import { useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { ZoomAnimEvent } from 'leaflet'
import usa from './data/usa.json'

const MASK_PANE = 'usMask'
const LABELS_PANE = 'basemapLabels'
const MESH_PANE = 'stationMesh'
const SELECTED_WELL_PANE = 'selectedWell'
const LNG_OFFSETS = [-720, -360, 0, 360, 720]
const PADDING = 0.1

type MapWithZoomInternals = L.Map & {
  _animatingZoom?: boolean
  _getNewPixelOrigin: (center: L.LatLng, zoom?: number) => L.Point
}

function asLatLngRing(ring: number[][]): [number, number][] {
  return ring.map((position) => {
    const lng = position[0]
    const lat = position[1]
    if (lng == null || lat == null) throw new Error('Invalid GeoJSON position')
    return [lat, lng]
  })
}

function usHolesFromGeoJson(): [number, number][][] {
  const holes: [number, number][][] = []

  for (const feature of usa.features) {
    const { geometry } = feature
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

    for (const polygon of polygons) {
      const outer = polygon[0]
      if (!outer) continue
      holes.push(asLatLngRing(outer))
    }
  }

  return holes
}

export function MapPanes() {
  const map = useMap()

  if (!map.getPane(LABELS_PANE)) {
    const pane = map.createPane(LABELS_PANE)
    pane.style.zIndex = '250'
  }

  if (!map.getPane(MASK_PANE)) {
    const pane = map.createPane(MASK_PANE)
    pane.style.zIndex = '350'
    pane.style.pointerEvents = 'none'
  }

  if (!map.getPane(MESH_PANE)) {
    const pane = map.createPane(MESH_PANE)
    pane.style.zIndex = '390'
  }

  if (!map.getPane(SELECTED_WELL_PANE)) {
    const pane = map.createPane(SELECTED_WELL_PANE)
    pane.style.zIndex = '450'
  }

  return null
}

export function UsMask() {
  const map = useMap()
  const holes = useMemo(() => usHolesFromGeoJson(), [])

  useEffect(() => {
    const pane = map.getPane(MASK_PANE)
    if (!pane) return
    const leafletMap = map as MapWithZoomInternals

    const canvas = document.createElement('canvas')
    canvas.className = 'leaflet-zoom-animated'
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    pane.appendChild(canvas)

    let drawnCenter = map.getCenter()
    let drawnZoom = map.getZoom()

    const drawRings = (ctx: CanvasRenderingContext2D, origin: L.Point, mode: 'fill' | 'stroke') => {
      for (const offset of LNG_OFFSETS) {
        for (const ring of holes) {
          ctx.beginPath()
          for (let i = 0; i < ring.length; i++) {
            const vertex = ring[i]
            if (!vertex) continue
            const point = map.latLngToLayerPoint([vertex[0], vertex[1] + offset])
            const x = point.x - origin.x
            const y = point.y - origin.y
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          if (mode === 'fill') ctx.fill()
          else ctx.stroke()
        }
      }
    }

    const updateTransform = (center: L.LatLng, zoom: number) => {
      const scale = map.getZoomScale(zoom, drawnZoom)
      const viewHalf = map.getSize().multiplyBy(0.5 + PADDING)
      const currentCenterPoint = map.project(drawnCenter, zoom)
      const topLeftOffset = viewHalf
        .multiplyBy(-scale)
        .add(currentCenterPoint)
        .subtract(leafletMap._getNewPixelOrigin(center, zoom))
      L.DomUtil.setTransform(canvas, topLeftOffset, scale)
    }

    const redraw = () => {
      if (leafletMap._animatingZoom) return

      const size = map.getSize()
      const origin = map.containerPointToLayerPoint(size.multiplyBy(-PADDING)).round()
      const padded = size.multiplyBy(1 + PADDING * 2).round()
      drawnCenter = map.getCenter()
      drawnZoom = map.getZoom()

      const dpr = window.devicePixelRatio || 1
      L.DomUtil.setPosition(canvas, origin)

      canvas.width = Math.max(1, Math.round(padded.x * dpr))
      canvas.height = Math.max(1, Math.round(padded.y * dpr))
      canvas.style.width = `${padded.x}px`
      canvas.style.height = `${padded.y}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, padded.x, padded.y)
      ctx.fillStyle = 'rgba(232, 238, 244, 0.72)'
      ctx.fillRect(0, 0, padded.x, padded.y)

      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      drawRings(ctx, origin, 'fill')

      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.85)'
      ctx.lineWidth = 1
      drawRings(ctx, origin, 'stroke')
    }

    const onAnimZoom = (event: ZoomAnimEvent) => {
      updateTransform(event.center, event.zoom)
    }

    const onZoom = () => {
      updateTransform(map.getCenter(), map.getZoom())
    }

    map.on('zoomanim', onAnimZoom)
    map.on('zoom', onZoom)
    map.on('moveend viewreset resize', redraw)
    redraw()

    return () => {
      map.off('zoomanim', onAnimZoom)
      map.off('zoom', onZoom)
      map.off('moveend viewreset resize', redraw)
      canvas.remove()
    }
  }, [holes, map])

  return null
}

export { LABELS_PANE, MESH_PANE, SELECTED_WELL_PANE }
