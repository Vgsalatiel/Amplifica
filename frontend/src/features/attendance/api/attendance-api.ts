import { apiFetch } from '../../../lib/api-client'
import type { MyShowAttendance, ShowAttendanceSummary } from '../../../types/api'

const base = (slug: string) => `/shows/${encodeURIComponent(slug)}/attendance`

export const getAttendance = (slug: string) => apiFetch<ShowAttendanceSummary>(base(slug))
export const getMyAttendance = (slug: string) => apiFetch<MyShowAttendance>(`${base(slug)}/me`)
export const setAttendance = (slug: string, showName: boolean) =>
  apiFetch<MyShowAttendance>(`${base(slug)}/me`, { method: 'PUT', json: { showName } })
export const removeAttendance = (slug: string) => apiFetch<void>(`${base(slug)}/me`, { method: 'DELETE' })
