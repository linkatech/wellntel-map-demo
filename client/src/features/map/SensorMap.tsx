import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LayerFilter, Sensor, SensorKind } from '../../../../shared/index.ts'
import { DEFAULT_BASEMAP, findBasemap, type BasemapId } from './basemaps.ts'
import { BasemapBar } from './BasemapBar.tsx'
import { isMeshLayer, isPointLayer, MESH_KINDS, POINT_KINDS } from './layerFilters.ts'
import { LayerStripe } from './LayerStripe.tsx'
import { US_BOUNDS, US_CENTER } from './mapBounds.ts'
import { MapLegend } from './MapLegend.tsx'
import { MapSidebar } from './MapSidebar.tsx'
import { hasReadingsInRange } from './readingCount.ts'
import { createTimeRange } from './timeRange.ts'
import { panelAccent, SENSOR_COLORS, sensorPathOptions } from './sensorStyle.ts'
import { SourceMesh } from './SourceMesh.tsx'
import { LABELS_PANE, MapPanes, SELECTED_WELL_PANE, UsMask } from './UsMask.tsx'
import { buildUsGrid } from './usGrid.ts'

type SensorMapProps = {
  sensors: Sensor[]
  error: string | null
  hasApiAccess: boolean
}

function FitUnitedStates() {
  const map = useMap()

  useEffect(() => {
    const fit = () => {
      map.invalidateSize()
      map.fitBounds(US_BOUNDS, { padding: [8, 8], maxZoom: 5 })
    }
    fit()
    const id = window.setTimeout(fit, 50)
    return () => window.clearTimeout(id)
  }, [map])

  return null
}

function formatReading(sensor: Sensor): string {
  const parts: string[] = []
  if (sensor.aquifer) parts.push(sensor.aquifer)
  if (sensor.depthFt != null) parts.push(`Depth ${sensor.depthFt} ft`)
  if (sensor.lastReadingFt != null) parts.push(`Water level ${sensor.lastReadingFt} ft`)
  return parts.join(' · ')
}

function SensorPopup({ sensor }: { sensor: Sensor }) {
  return (
    <Popup>
      <div className="sensor-popup">
        <h3>{sensor.name}</h3>
        <p>{SENSOR_COLORS[sensor.kind].label}</p>
        <p>{formatReading(sensor)}</p>
      </div>
    </Popup>
  )
}

function selectedWellIcon(kind: SensorKind): L.DivIcon {
  return L.divIcon({
    className: 'selected-well-icon',
    html: `<span class="sensor-selected selected-well-swatch" style="--accent:${panelAccent(kind).accent}"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function SelectedWellMarker({
  sensor,
  onSelect,
}: {
  sensor: Sensor
  onSelect: (id: string) => void
}) {
  const icon = useMemo(() => selectedWellIcon(sensor.kind), [sensor.kind])
  return (
    <Marker
      position={[sensor.lat, sensor.lng]}
      icon={icon}
      pane={SELECTED_WELL_PANE}
      eventHandlers={{
        click: () => onSelect(sensor.id),
      }}
    >
      <SensorPopup sensor={sensor} />
    </Marker>
  )
}

function uniqueKinds(list: Sensor[]): SensorKind[] {
  const seen = new Set<SensorKind>()
  const kinds: SensorKind[] = []
  for (const sensor of list) {
    if (seen.has(sensor.kind)) continue
    seen.add(sensor.kind)
    kinds.push(sensor.kind)
  }
  return kinds
}

export function SensorMap({ sensors, error, hasApiAccess }: SensorMapProps) {
  const [basemapId, setBasemapId] = useState<BasemapId>(DEFAULT_BASEMAP)
  const [layer, setLayer] = useState<LayerFilter>('all')
  // Selections are remembered per tab so switching tabs never loses them.
  const [selectedIdByLayer, setSelectedIdByLayer] = useState<Partial<Record<LayerFilter, string | null>>>({})
  const [selectedCellByLayer, setSelectedCellByLayer] = useState<Partial<Record<LayerFilter, string | null>>>({})
  const [timeRange, setTimeRange] = useState(() => createTimeRange('current-calendar'))
  const [helpOpen, setHelpOpen] = useState(false)
  const [checkedStationIds, setCheckedStationIds] = useState<ReadonlySet<string>>(() => new Set())

  const selectedId = selectedIdByLayer[layer] ?? null
  const selectedCellId = selectedCellByLayer[layer] ?? null
  const setSelectedId = useCallback(
    (id: string | null) => setSelectedIdByLayer((current) => ({ ...current, [layer]: id })),
    [layer],
  )
  const setSelectedCellId = useCallback(
    (id: string | null) => setSelectedCellByLayer((current) => ({ ...current, [layer]: id })),
    [layer],
  )

  const basemap = findBasemap(basemapId)
  const sensorsInRange = useMemo(
    () => sensors.filter((sensor) => hasReadingsInRange(sensor, timeRange.start, timeRange.end)),
    [sensors, timeRange.end, timeRange.start],
  )
  const locationsByKind = useMemo(() => {
    const byKind: Partial<Record<SensorKind, Sensor[]>> = {}
    for (const kind of POINT_KINDS) {
      byKind[kind] = sensorsInRange
        .filter((sensor) => sensor.kind === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
    }
    return byKind
  }, [sensorsInRange])
  const layerLocations = useMemo(
    () => (isPointLayer(layer) ? (locationsByKind[layer] ?? []) : []),
    [layer, locationsByKind],
  )
  const pointSensors = useMemo(() => {
    if (layer === 'all' || isPointLayer(layer)) {
      const wanted = layer === 'all' ? POINT_KINDS : [layer]
      return sensorsInRange.filter((sensor) => wanted.includes(sensor.kind))
    }
    return []
  }, [layer, sensorsInRange])
  const meshSensors = useMemo(() => {
    if (layer === 'all' || isMeshLayer(layer)) {
      const wanted = layer === 'all' ? MESH_KINDS : [layer]
      return sensorsInRange.filter((sensor) => wanted.includes(sensor.kind))
    }
    return []
  }, [layer, sensorsInRange])
  const meshCells = useMemo(() => buildUsGrid(meshSensors), [meshSensors])
  const selectedCell = useMemo(
    () => meshCells.find((cell) => cell.id === selectedCellId) ?? null,
    [meshCells, selectedCellId],
  )
  const legendKinds = useMemo(
    () => uniqueKinds([...pointSensors, ...meshSensors]),
    [meshSensors, pointSensors],
  )
  const selectedWell = pointSensors.find((sensor) => sensor.id === selectedId) ?? null

  useEffect(() => {
    if (!isPointLayer(layer)) return
    if (selectedId && layerLocations.some((location) => location.id === selectedId)) return
    setSelectedId(layerLocations[0]?.id ?? null)
  }, [layer, selectedId, layerLocations, setSelectedId])

  function setStationsChecked(ids: string[], checked: boolean) {
    setCheckedStationIds((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function handleLayerChange(next: LayerFilter) {
    setLayer(next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <LayerStripe
        value={layer}
        onChange={handleLayerChange}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          <MapContainer
            center={US_CENTER}
            zoom={5}
            minZoom={3}
            maxZoom={16}
            scrollWheelZoom
            className="h-full w-full"
          >
            <MapPanes />
            <FitUnitedStates />
            <TileLayer
              key={basemap.id}
              url={basemap.url}
              attribution={basemap.attribution}
              maxZoom={16}
            />
            {basemap.labelsUrl ? (
              <TileLayer url={basemap.labelsUrl} pane={LABELS_PANE} attribution="" />
            ) : null}
            <UsMask />

            {meshSensors.length > 0 ? (
              <SourceMesh
                cells={meshCells}
                accentKind={isMeshLayer(layer) ? layer : undefined}
                selectedCellId={layer === 'all' ? null : selectedCellId}
                onSelectCell={
                  layer === 'all'
                    ? undefined
                    : (id) => setSelectedCellId(id === selectedCellId ? null : id)
                }
              />
            ) : null}

            {pointSensors
              .filter((sensor) => sensor.id !== selectedId)
              .map((sensor) => (
                <CircleMarker
                  key={sensor.id}
                  center={[sensor.lat, sensor.lng]}
                  radius={8}
                  pathOptions={sensorPathOptions(sensor.kind)}
                  eventHandlers={{
                    click: () => {
                      if (layer === sensor.kind) {
                        setSelectedId(sensor.id)
                      }
                    },
                  }}
                >
                  <SensorPopup sensor={sensor} />
                </CircleMarker>
              ))}

            {layer !== 'all' && selectedWell ? (
              <SelectedWellMarker sensor={selectedWell} onSelect={setSelectedId} />
            ) : null}

          </MapContainer>

          {layer === 'all' ? <MapLegend kinds={legendKinds} /> : null}

          {error ? (
            <div className="absolute bottom-10 left-3 z-[1000] rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
              {error}
            </div>
          ) : null}
        </div>
        <MapSidebar
          layer={layer}
          locations={layerLocations}
          sensors={sensorsInRange}
          selectedId={selectedId}
          onSelect={setSelectedId}
          cell={selectedCell}
          checkedStationIds={checkedStationIds}
          onSetStationsChecked={setStationsChecked}
          onClearCell={() => setSelectedCellId(null)}
          timeRange={timeRange}
          helpOpen={helpOpen}
          onHelpOpenChange={setHelpOpen}
          hasApiAccess={hasApiAccess}
        />
      </div>
      <BasemapBar value={basemapId} onChange={setBasemapId} />
      {helpOpen ? <div className="absolute inset-0 z-[2000] bg-black/50" /> : null}
      </div>
    </div>
  )
}
