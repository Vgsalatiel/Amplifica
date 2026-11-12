import { apiFetch } from '../../../lib/api-client'
import type { PublicUser, User } from '../../../types/api'

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
