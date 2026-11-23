import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playbackMemory, resetPlaybackMemory } from '../../features/home/lib/playback-memory'
import type { PlaylistItem } from '../../features/home/lib/playlist'
import { MiniPlayer } from './mini-player'

const created = vi.hoisted(() => ({
  options: [] as Array<{ videoId: string; playerVars: Record<string, string | number> }>,
  loaded: [] as string[],
  paused: 0,
}))

vi.mock('../../lib/youtube-api', () => ({
  loadYouTubeApi: () =>
    Promise.resolve({
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
      Player: class {
        constructor(_element: HTMLElement, options: (typeof created.options)[number]) {
          created.options.push(options)
        }
        loadVideoById(id: string) {
          created.loaded.push(id)
        }
        playVideo() {}
        pauseVideo() {
          created.paused += 1
        }
        getCurrentTime() {
          return 0
        }
        getPlayerState() {
          return 1
        }
        destroy() {}
        getIframe() {
          return document.createElement('iframe')
        }
      },
    }),
}))

const item = (id: string, videoId: string, name: string): PlaylistItem => ({
  id,
  videoId,
  title: `Clipe de ${name}`,
  subtitle: name,
  artist: { slug: id, name },
  suggestedBy: null,
})

const a = item('banda-a', 'dQw4w9WgXcQ', 'Banda A')
const b = item('banda-b', '3psvNDHQv7Y', 'Banda B')

const view = (onHome: boolean) => (
  <MemoryRouter>
    <MiniPlayer onHome={onHome} />
  </MemoryRouter>
)

beforeEach(() => {
  resetPlaybackMemory()
  created.options.length = 0
  created.loaded.length = 0
  created.paused = 0
})
afterEach(() => resetPlaybackMemory())

describe('MiniPlayer', () => {
  it('não aparece se nada estava tocando com som quando a pessoa saiu da home', () => {
    const { rerender } = render(view(true))
    rerender(view(false))
    expect(screen.queryByRole('region', { name: 'Mini-player' })).not.toBeInTheDocument()
  })

  it('continua do clipe e do segundo em que a home parou, com som, e some ao voltar para a home', async () => {
    const { rerender } = render(view(true))
    Object.assign(playbackMemory, { items: [a, b], selectedId: 'banda-b', time: 42.7, live: true })
    rerender(view(false))

    expect(screen.getByRole('region', { name: 'Mini-player' })).toBeInTheDocument()
    expect(screen.getByText('Clipe de Banda B')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Banda B' })).toHaveAttribute('href', '/artistas/banda-b')
    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.videoId).toBe('3psvNDHQv7Y')
    expect(created.options[0]!.playerVars).toMatchObject({ mute: 0, start: 42 })

    rerender(view(true))
    expect(screen.queryByRole('region', { name: 'Mini-player' })).not.toBeInTheDocument()
  })

  it('tem pausar, próximo, anterior e fechar', async () => {
    const { rerender } = render(view(true))
    Object.assign(playbackMemory, { items: [a, b], selectedId: 'banda-a', time: 0, live: true })
    rerender(view(false))
    await vi.waitFor(() => expect(created.options).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(created.paused).toBe(1)
    expect(screen.getByRole('button', { name: 'Tocar' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Próximo clipe' }))
    expect(screen.getByText('Clipe de Banda B')).toBeInTheDocument()
    await vi.waitFor(() => expect(created.loaded).toEqual(['3psvNDHQv7Y']))

    fireEvent.click(screen.getByRole('button', { name: 'Fechar o mini-player' }))
    expect(screen.queryByRole('region', { name: 'Mini-player' })).not.toBeInTheDocument()
    expect(playbackMemory.live).toBe(false)
  })
})
