import { apiFetch } from '../../../lib/api-client'
import type { ReportedComment, ShowComment } from '../../../types/api'

const board = (slug: string) => `/shows/${encodeURIComponent(slug)}/comments`

export const listComments = (slug: string) => apiFetch<ShowComment[]>(board(slug))
export const createComment = (slug: string, body: string) =>
  apiFetch<ShowComment>(board(slug), { method: 'POST', json: { body } })
export const deleteComment = (id: string) => apiFetch<void>(`/comments/${id}`, { method: 'DELETE' })
export const reportComment = (id: string, reason?: string) =>
  apiFetch<void>(`/comments/${id}/reports`, { method: 'POST', json: reason ? { reason } : {} })
export const listReportedComments = () => apiFetch<ReportedComment[]>('/comments/reported')
export const dismissReports = (id: string) => apiFetch<void>(`/comments/${id}/reports`, { method: 'DELETE' })
