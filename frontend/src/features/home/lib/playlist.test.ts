import { describe, expect, it } from 'vitest'
import type { PlaylistClip } from '../../../types/api'
import type { Clip } from './clips'
import { fromApi, fromConstants } from './playlist'

const api: PlaylistClip = {
  id: 'c1',
  youtubeId: '3psvNDHQv7Y',
  title: 'Tentar De Novo',
  channelName: 'Canal Fresno',
  pinned: true,
  artist: { slug: 'fresno', name: 'Fresno' },
  suggestedBy: null,
  createdAt: '2026-11-17T12:00:00.000Z',
}

describe('fromApi', () => {
  it('usa o nome da banda do catálogo embaixo do título, e o canal quando não há banda', () => {
    const items = fromApi([
      api,
      { ...api, id: 'c2', artist: null, suggestedBy: { username: 'ana', displayName: 'Ana' } },
    ])

    expect(items[0]).toMatchObject({ id: 'c1', videoId: '3psvNDHQv7Y', title: 'Tentar De Novo', subtitle: 'Fresno' })
    expect(items[1]).toMatchObject({ subtitle: 'Canal Fresno', artist: null, suggestedBy: { username: 'ana' } })
  })
})

describe('fromConstants', () => {
  const clip = (overrides: Partial<Clip>): Clip => ({
    id: 'a',
    artistSlug: 'banda-a',
    band: 'Banda A',
    title: null,
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ...overrides,
  })

  it('aceita o link inteiro, usa a banda como título quando falta e pula quem não tem vídeo', () => {
    const items = fromConstants([
      clip({}),
      clip({ id: 'b', youtube: null }),
      clip({ id: 'c', youtube: 'https://exemplo.com' }),
    ])

    expect(items).toEqual([
      {
        id: 'a',
        videoId: 'dQw4w9WgXcQ',
        title: 'Banda A',
        subtitle: 'Banda A',
        artist: { slug: 'banda-a', name: 'Banda A' },
        suggestedBy: null,
      },
    ])
  })
})
