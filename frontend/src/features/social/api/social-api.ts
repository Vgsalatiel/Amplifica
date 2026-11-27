import { apiFetch } from '../../../lib/api-client'
import type { ImageSet, PublicUser } from '../../../types/api'

export interface FollowState {
  following: boolean
}

export interface FollowCounts {
  followers: number
  following: number
}

interface FeedBase {
  id: string
  /** Quando aconteceu (ISO). */
  at: string
  user: { username: string; displayName: string; avatar: ImageSet | null }
}

/** Uma atividade de quem a pessoa segue. */
export type FeedItem =
  | (FeedBase & {
      type: 'review'
      rating: number
      excerpt: string | null
      release: { slug: string; title: string; cover: ImageSet | null; artists: string[] }
    })
  | (FeedBase & { type: 'favorite'; artist: { slug: string; name: string; image: ImageSet | null } })
  | (FeedBase & {
      type: 'clip'
      clip: { youtubeId: string; title: string; artist: { slug: string; name: string } | null }
    })
  | (FeedBase & {
      type: 'attendance'
      show: { slug: string; title: string; date: string; city: string; state: string }
    })

export interface FeedPage {
  items: FeedItem[]
  /** Passe como `before` para a próxima página; `null` quando acabou. */
  next: string | null
  /** Quantas pessoas a pessoa segue. */
  following: number
}

const user = (username: string) => `/users/${encodeURIComponent(username)}`

export const getFollowState = (username: string) => apiFetch<FollowState>(`${user(username)}/follow`)
export const followUser = (username: string) => apiFetch<FollowState>(`${user(username)}/follow`, { method: 'PUT' })
export const unfollowUser = (username: string) => apiFetch<void>(`${user(username)}/follow`, { method: 'DELETE' })
export const getFollowCounts = (username: string) => apiFetch<FollowCounts>(`${user(username)}/follows`)
export const listFollowers = (username: string) => apiFetch<PublicUser[]>(`${user(username)}/followers`)
export const listFollowing = (username: string) => apiFetch<PublicUser[]>(`${user(username)}/following`)

export const getFeed = (before?: string) =>
  apiFetch<FeedPage>(`/feed?limit=20${before ? `&before=${encodeURIComponent(before)}` : ''}`)
