import { apiFetch } from '../../../lib/api-client'
import type { ArtistSummary } from '../../../types/api'

export interface MyFavorite {
  favorite: boolean
}

export const getMyFavorite = (slug: string) =>
  apiFetch<MyFavorite>(`/artists/${encodeURIComponent(slug)}/favorite`)

export const addFavorite = (slug: string) =>
  apiFetch<MyFavorite>(`/artists/${encodeURIComponent(slug)}/favorite`, { method: 'PUT' })

export const removeFavorite = (slug: string) =>
  apiFetch<void>(`/artists/${encodeURIComponent(slug)}/favorite`, { method: 'DELETE' })

export const listFavorites = (username: string) =>
  apiFetch<ArtistSummary[]>(`/users/${encodeURIComponent(username)}/favorites`)
