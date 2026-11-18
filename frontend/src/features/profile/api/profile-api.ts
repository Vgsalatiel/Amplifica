import { apiFetch } from '../../../lib/api-client'
import type { PublicUser, TasteMatch, User } from '../../../types/api'

export interface UpdateProfileInput {
  displayName: string
  bio: string
}

export function getProfile(username: string): Promise<PublicUser> {
  return apiFetch<PublicUser>(`/users/${encodeURIComponent(username)}`)
}

export function updateProfile(input: UpdateProfileInput): Promise<User> {
  return apiFetch<User>('/users/me', { method: 'PATCH', json: input })
}

function avatarForm(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

export const uploadAvatar = (file: File) =>
  apiFetch<User>('/users/me/avatar', { method: 'PUT', form: avatarForm(file) })

export const removeAvatar = () => apiFetch<User>('/users/me/avatar', { method: 'DELETE' })

export const searchProfiles = (q: string) => apiFetch<PublicUser[]>(`/users/search?q=${encodeURIComponent(q)}`)

export const getTasteMatch = (username: string) =>
  apiFetch<TasteMatch>(`/users/${encodeURIComponent(username)}/compatibility`)
