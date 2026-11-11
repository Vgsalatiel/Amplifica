import { apiFetch } from '../../../lib/api-client'

export interface HealthResponse {
  status: 'ok'
  database: 'up'
  timestamp: string
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}
