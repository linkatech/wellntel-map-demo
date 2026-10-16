import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Polygon, useMap } from 'react-leaflet'
import type { SensorKind } from '../../../../shared/index.ts'
import { SENSOR_COLORS } from './sensorStyle.ts'
import { MESH_PANE } from './UsMask.tsx'
import type { GridCell } from './usGrid.ts'

const LIST_CAP = 12
const CLOSE_DELAY_MS = 250
const MUTED_STROKE = '#94a3b8'
const MUTED_FILL = '#6b7280'

type SourceMeshProps = {
  cells: GridCell[]
  accentKind?: SensorKind
  selectedCellId: string | null
  onSelectCell?: (id: string) => void
}

type HoverState = {
  cell: GridCell
  latlng: L.LatLng
}

function fillOpacity(count: number, maxCount: number): number {
  if (count === 0) return 0.04
  if (maxCount <= 0) return 0.12
  return 0.1 + (count / maxCount) * 0.45
}

type CellTooltipProps = {
  hover: HoverState | null
  onEnter: () => void
  onLeave: () => void
}

// A hover card that stays put where the cursor entered the cell, and stays open
// while the cursor is over it so that its list can be scrolled.
function CellTooltip({ hover, onEnter, onLeave }: CellTooltipProps) {
  const map = useMap()
  const [content] = useState(() => document.createElement('div'))
  const tooltipRef = useRef<L.Tooltip | null>(null)
  const handlersRef = useRef({ onEnter, onLeave })
  handlersRef.current = { onEnter, onLeave }

  useEffect(() => {
    const tooltip = L.tooltip({
      interactive: true,
      direction: 'auto',
      offset: [6, 0],
      opacity: 1,
      className: 'station-mesh-tooltip',
    })
    tooltip.setContent(content)
    tooltipRef.current = tooltip

    return () => {
      tooltip.remove()
      tooltipRef.current = null
    }
  }, [content])

  useEffect(() => {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    if (!hover) {
      tooltip.remove()
      return
    }

    tooltip.setLatLng(hover.latlng)
    if (!map.hasLayer(tooltip)) tooltip.addTo(map)

    const element = tooltip.getElement()
    if (!element) return
    L.DomEvent.disableScrollPropagation(element)
    L.DomEvent.disableClickPropagation(element)
    const enter = () => handlersRef.current.onEnter()
    const leave = () => handlersRef.current.onLeave()
    element.addEventListener('mouseenter', enter)
    element.addEventListener('mouseleave', leave)
    return () => {
      element.removeEventListener('mouseenter', enter)
      element.removeEventListener('mouseleave', leave)
    }
  }, [hover, map])

  if (!hover) return null

  const { stations } = hover.cell
  const count = stations.length

  return createPortal(
    <div>
      <strong>
        {count} {count === 1 ? 'station' : 'stations'}
      </strong>
      {count === 0 ? (
        <p>No stations in this cell for this time range</p>
      ) : (
        <ul>
          {stations.slice(0, LIST_CAP).map((station) => (
            <li key={station.id}>{station.name}</li>
          ))}
        </ul>
      )}
      {count > LIST_CAP ? <p>and {count - LIST_CAP} more</p> : null}
    </div>,
    content,
  )
}

export function SourceMesh({ cells, accentKind, selectedCellId, onSelectCell }: SourceMeshProps) {
  const maxCount = cells.reduce((max, cell) => Math.max(max, cell.stations.length), 0)
  const colors = SENSOR_COLORS[accentKind ?? 'usgs-wells']
  const stroke = accentKind ? colors.stroke : '#1e6bb8'
  const fill = accentKind ? colors.fill : '#1e6bb8'

  const [hover, setHover] = useState<HoverState | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const cancelClose = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = undefined
  }, [])

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS)
  }, [])

  const openFor = useCallback(
    (cell: GridCell, latlng: L.LatLng) => {
      cancelClose()
      setHover((current) => (current?.cell.id === cell.id ? current : { cell, latlng }))
    },
    [cancelClose],
  )

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Drop the card if the underlying data changes out from under it.
  useEffect(() => {
    setHover(null)
  }, [cells])

  const selectedCell = selectedCellId ? cells.find((cell) => cell.id === selectedCellId) : undefined

  return (
    <>
      {cells.map((cell) => {
        const count = cell.stations.length
        const muted = selectedCell != null && cell.id !== selectedCell.id
        return cell.parts.map((positions, index) => (
          <Polygon
            key={`${cell.id}-${index}`}
            pane={MESH_PANE}
            positions={positions}
            pathOptions={{
              color: selectedCell ? MUTED_STROKE : stroke,
              weight: 1,
              fillColor: muted ? MUTED_FILL : fill,
              fillOpacity: fillOpacity(count, maxCount),
              opacity: selectedCell ? 0.8 : 0.65,
            }}
            eventHandlers={{
              click: onSelectCell ? () => onSelectCell(cell.id) : undefined,
              mouseover: (event) => openFor(cell, event.latlng),
              mouseout: scheduleClose,
            }}
          />
        ))
      })}
      {/* Drawn last so neighbouring borders never cover it; non-interactive so hover/click hit the cell below. */}
      {selectedCell
        ? selectedCell.parts.map((positions, index) => (
            <Polygon
              key={`selected-${selectedCell.id}-${index}`}
              pane={MESH_PANE}
              positions={positions}
              interactive={false}
              pathOptions={{ color: stroke, weight: 2, opacity: 1, fill: false }}
            />
          ))
        : null}
      <CellTooltip hover={hover} onEnter={cancelClose} onLeave={scheduleClose} />
    </>
  )
}
