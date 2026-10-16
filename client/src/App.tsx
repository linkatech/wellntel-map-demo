import { useEffect, useState } from 'react'
import type { Sensor } from '../../shared/index.ts'
import { SensorMap } from './features/map/SensorMap.tsx'
import { DemoNotes } from './features/notes/DemoNotes.tsx'
import { fetchSensors } from './lib/api.ts'

export default function App() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasApiAccess, setHasApiAccess] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchSensors()
      .then((payload) => {
        if (!cancelled) {
          setSensors(payload.sensors)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sensors')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="box-border flex h-full min-h-0 justify-end gap-6 bg-[#0b0b0b] px-6 py-8">
      <div className="flex h-full w-[70%] min-h-0 shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
        <SensorMap sensors={sensors} error={error} hasApiAccess={hasApiAccess} />
      </div>
      <DemoNotes hasApiAccess={hasApiAccess} onApiAccessChange={setHasApiAccess} />
    </div>
  )
}
