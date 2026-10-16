import type { SensorsResponse } from '../../../shared/index.ts'
import { apiPath } from './apiBase.ts'

export async function fetchSensors(): Promise<SensorsResponse> {
  const response = await fetch(apiPath('/api/sensors'))
  if (!response.ok) {
    throw new Error(`Failed to load sensors (${response.status})`)
  }
  return (await response.json()) as SensorsResponse
}
