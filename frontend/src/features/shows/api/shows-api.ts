import { apiFetch } from '../../../lib/api-client'
import type { Paginated, Show, ShowImportPreview, ShowStatus } from '../../../types/api'

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export interface ShowInput {
  name: string
  slug?: string
  date: string
  startTime: string
  venue: string
  city: string
  state: string
  ticketUrl: string
  status: ShowStatus
  /** Quando a informação foi conferida pela última vez ("AAAA-MM-DD"). */
  verifiedAt: string
  acts: Array<{ name: string; artistId: string | null }>
  genreIds: string[]
}

export type ShowWhen = 'upcoming' | 'past' | 'all'

export interface ShowListParams {
  page?: number
  limit?: number
  /** Padrão da API: `upcoming`. */
  when?: ShowWhen
  /** Sigla do estado, como SP. */
  state?: string
  city?: string
  /** Slug de um gênero; inclui os subgêneros. */
  genre?: string
  /** Slug de uma banda do catálogo. */
  artist?: string
  /** Mês, "AAAA-MM". */
  month?: string
  /** Sem este filtro, shows cancelados ficam de fora. */
  status?: ShowStatus
}

export const listShows = (params: ShowListParams) => apiFetch<Paginated<Show>>(`/shows${query({ ...params })}`)
export const getShow = (slug: string) => apiFetch<Show>(`/shows/${encodeURIComponent(slug)}`)
export const createShow = (input: ShowInput) => apiFetch<Show>('/shows', { method: 'POST', json: input })
export const updateShow = (id: string, input: ShowInput) =>
  apiFetch<Show>(`/shows/${id}`, { method: 'PATCH', json: input })
export const deleteShow = (id: string) => apiFetch<void>(`/shows/${id}`, { method: 'DELETE' })
export const previewShowImport = (url: string) =>
  apiFetch<ShowImportPreview>('/shows/import-preview', { method: 'POST', json: { url } })
