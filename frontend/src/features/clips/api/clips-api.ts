import { apiFetch } from '../../../lib/api-client'
import type { ClipStatus, MyClip, PlaylistClip, ReviewClip } from '../../../types/api'

/** A playlist pública da página inicial: fixos primeiro, depois as sugestões aprovadas. */
export const listClips = () => apiFetch<PlaylistClip[]>('/clips?limit=20')

/** As sugestões de quem está logado, com a situação de cada uma. */
export const listMyClips = () => apiFetch<MyClip[]>('/clips/mine')

/** Sugere um clipe pelo link do YouTube. Fica pendente até um administrador aprovar. */
export const suggestClip = (url: string) => apiFetch<MyClip>('/clips', { method: 'POST', json: { url } })

/** Fila de moderação (administradores): as sugestões em uma situação. */
export const listClipsForReview = (status: ClipStatus) => apiFetch<ReviewClip[]>(`/clips/review?status=${status}`)

/** Aprova ou recusa uma sugestão e, se quiser, liga o clipe a uma banda do catálogo (`null` desliga). */
export const reviewClip = (id: string, input: { status: 'APPROVED' | 'REJECTED'; artistId?: string | null }) =>
  apiFetch<ReviewClip>(`/clips/${id}`, { method: 'PATCH', json: input })

export const deleteClip = (id: string) => apiFetch<void>(`/clips/${id}`, { method: 'DELETE' })
