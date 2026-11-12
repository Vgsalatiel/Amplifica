import { apiFetch } from '../../../lib/api-client'
import type {
  ArtistDetail,
  ArtistSummary,
  ArtistType,
  GenreDetail,
  GenreItem,
  GenreNode,
  Paginated,
  ReleaseArtistRole,
  ReleaseDetail,
  ReleaseSummary,
  ReleaseType,
} from '../../../types/api'

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

function imageForm(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

// ---------------------------------------------------------------------------
// Gêneros
// ---------------------------------------------------------------------------

export interface GenreInput {
  name: string
  slug?: string
  description: string
  parentId: string | null
}

export const getGenreTree = () => apiFetch<GenreNode[]>('/genres')
export const getGenre = (slug: string) => apiFetch<GenreDetail>(`/genres/${encodeURIComponent(slug)}`)
export const createGenre = (input: GenreInput) => apiFetch<GenreItem>('/genres', { method: 'POST', json: input })
export const updateGenre = (id: string, input: GenreInput) =>
  apiFetch<GenreItem>(`/genres/${id}`, { method: 'PATCH', json: input })
export const deleteGenre = (id: string) => apiFetch<void>(`/genres/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Artistas
// ---------------------------------------------------------------------------

export interface ArtistInput {
  name: string
  slug?: string
  type: ArtistType
  bio: string
  country: string | null
  city: string
  formedYear: number | null
  disbandedYear: number | null
  genreIds: string[]
}

export interface ArtistListParams {
  page?: number
  limit?: number
  q?: string
  genre?: string
}

export const listArtists = (params: ArtistListParams) =>
  apiFetch<Paginated<ArtistSummary>>(`/artists${query({ ...params })}`)
export const getArtist = (slug: string) => apiFetch<ArtistDetail>(`/artists/${encodeURIComponent(slug)}`)
export const createArtist = (input: ArtistInput) =>
  apiFetch<ArtistSummary>('/artists', { method: 'POST', json: input })
export const updateArtist = (id: string, input: ArtistInput) =>
  apiFetch<ArtistSummary>(`/artists/${id}`, { method: 'PATCH', json: input })
export const deleteArtist = (id: string) => apiFetch<void>(`/artists/${id}`, { method: 'DELETE' })
export const uploadArtistImage = (id: string, file: File) =>
  apiFetch<ArtistSummary>(`/artists/${id}/image`, { method: 'PUT', form: imageForm(file) })
export const removeArtistImage = (id: string) => apiFetch<ArtistSummary>(`/artists/${id}/image`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export interface ReleaseInput {
  title: string
  slug?: string
  type: ReleaseType
  releaseDate: string
  description: string
  youtube: string
  artists: Array<{ artistId: string; role: ReleaseArtistRole }>
  tracks: Array<{ title: string; discNumber: number; position: number; durationMs: number | null }>
}

export interface ReleaseListParams {
  page?: number
  limit?: number
  type?: ReleaseType
  artist?: string
}

export const listReleases = (params: ReleaseListParams) =>
  apiFetch<Paginated<ReleaseSummary>>(`/releases${query({ ...params })}`)
export const getRelease = (slug: string) => apiFetch<ReleaseDetail>(`/releases/${encodeURIComponent(slug)}`)
export const createRelease = (input: ReleaseInput) =>
  apiFetch<ReleaseDetail>('/releases', { method: 'POST', json: input })
export const updateRelease = (id: string, input: Partial<ReleaseInput> & { accentColor?: string | null }) =>
  apiFetch<ReleaseDetail>(`/releases/${id}`, { method: 'PATCH', json: input })
export const deleteRelease = (id: string) => apiFetch<void>(`/releases/${id}`, { method: 'DELETE' })
export const uploadReleaseCover = (id: string, file: File) =>
  apiFetch<ReleaseDetail>(`/releases/${id}/cover`, { method: 'PUT', form: imageForm(file) })
export const removeReleaseCover = (id: string) => apiFetch<ReleaseDetail>(`/releases/${id}/cover`, { method: 'DELETE' })
