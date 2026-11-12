import { apiFetch } from '../../../lib/api-client'
import type { Paginated, Review, UserReview } from '../../../types/api'

export interface ReviewInput {
  rating: number
  /** Texto da resenha. Vazio vale como "só a nota". */
  body: string
}

const enc = encodeURIComponent

export const listReviews = (slug: string, page: number) =>
  apiFetch<Paginated<Review>>(`/releases/${enc(slug)}/reviews?page=${page}`)

export const getMyReview = (slug: string) => apiFetch<Review>(`/releases/${enc(slug)}/reviews/me`)

export const saveMyReview = (slug: string, input: ReviewInput) =>
  apiFetch<Review>(`/releases/${enc(slug)}/reviews/me`, {
    method: 'PUT',
    json: { rating: input.rating, body: input.body },
  })

export const deleteMyReview = (slug: string) =>
  apiFetch<void>(`/releases/${enc(slug)}/reviews/me`, { method: 'DELETE' })

/** Moderação: o autor ou um administrador apaga uma avaliação específica. */
export const deleteReview = (id: string) => apiFetch<void>(`/reviews/${id}`, { method: 'DELETE' })

export const listUserReviews = (username: string, page: number) =>
  apiFetch<Paginated<UserReview>>(`/users/${enc(username)}/reviews?page=${page}`)
