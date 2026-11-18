import { apiFetch } from '../../../lib/api-client'
import type { GroupStatus, ReviewGroup, ShowGroup } from '../../../types/api'

const list = (slug: string) => `/shows/${encodeURIComponent(slug)}/groups`

export const listGroups = (slug: string) => apiFetch<ShowGroup[]>(list(slug))
export const suggestGroup = (slug: string, url: string) =>
  apiFetch<ShowGroup & { status: GroupStatus }>(list(slug), { method: 'POST', json: { url } })
export const listGroupsForReview = (status: GroupStatus) => apiFetch<ReviewGroup[]>(`/groups/review?status=${status}`)
export const reviewGroup = (id: string, status: 'APPROVED' | 'REJECTED') =>
  apiFetch<void>(`/groups/${id}`, { method: 'PATCH', json: { status } })
export const deleteGroup = (id: string) => apiFetch<void>(`/groups/${id}`, { method: 'DELETE' })
