import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endSession } from '../../../lib/session'
import { artistDetail, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import type { Clip } from '../lib/clips'
import type { PlaylistItem } from '../lib/playlist'
import { NowPlaying } from './now-playing'

const created = vi.hoisted(() => ({
  options: [] as Array<{ videoId: string; playerVars: Record<string, string | number> }>,
  loaded: [] as string[],
}))

vi.mock('../../../lib/youtube-api', () => ({
  loadYouTubeApi: () =>
    Promise.resolve({
      PlayerState: { ENDED: 0, PLAYING: 1 },
      Player: class {
        constructor(_element: HTMLElement, options: (typeof created.options)[number]) {
          created.options.push(options)
        }
        loadVideoById(id: string) {
          created.loaded.push(id)
        }
        destroy() {}
        getIframe() {
          return document.createElement('iframe')
        }
      },
    }),
}))

const item = (id: string, videoId: string, subtitle: string, extra: Partial<PlaylistItem> = {}): PlaylistItem => ({
  id,
  videoId,
  title: `Clipe de ${subtitle}`,
  subtitle,
  artist: { slug: id, name: subtitle },
  suggestedBy: null,
  ...extra,
})

const a = item('banda-a', 'dQw4w9WgXcQ', 'Banda A')
const b = item('banda-b', '3psvNDHQv7Y', 'Banda B', {
  artist: null,
  suggestedBy: { username: 'ana', displayName: 'Ana' },
})
const cover: Clip = { id: 'banda-c', artistSlug: 'banda-c', band: 'Banda C', title: null, youtube: null }

function mockCover() {
  mockApi({
    'GET /artists/banda-c': {
      status: 200,
      body: artistDetail({ slug: 'banda-c', name: 'Banda C', releases: [releaseSummary()] }),
    },
  })
}

function reducedMotion(value: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: value && query.includes('reduce'), media: query }))
}

beforeEach(() => endSession())

afterEach(() => {
  vi.unstubAllGlobals()
  created.options.length = 0
  created.loaded.length = 0
})

describe('NowPlaying', () => {
  it('toca sozinho e sem som, com todos os clipes na mesma tela', async () => {
    renderWithProviders(<NowPlaying items={[a, b]} />)

    expect(screen.getByText('E agora, confira as novidades.')).toBeInTheDocument()
    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.videoId).toBe('dQw4w9WgXcQ')
    expect(created.options[0]!.playerVars).toMatchObject({ autoplay: 1, mute: 1 })
    expect(screen.getByText(/O vídeo começa sem som/)).toBeInTheDocument()
  })

  it('mostra a playlist em lista, com quem sugeriu, e não tem a seta "Próximo clipe"', () => {
    renderWithProviders(<NowPlaying items={[a, b]} />)

    const playlist = screen.getByRole('list', { name: 'Playlist' })
    expect(within(playlist).getAllByRole('button')).toHaveLength(2)
    expect(within(playlist).getByText(/sugerido por @ana/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Próximo clipe/ })).not.toBeInTheDocument()
  })

  it('clicar em um clipe da playlist toca aquele clipe, agora com som', async () => {
    renderWithProviders(<NowPlaying items={[a, b]} />)
    await vi.waitFor(() => expect(created.options).toHaveLength(1))

    fireEvent.click(
      within(screen.getByRole('list', { name: 'Playlist' })).getByRole('button', { name: /Clipe de Banda B/ }),
    )

    // O clique liga o som, então o player é refeito já no clipe escolhido.
    await vi.waitFor(() => expect(created.options).toHaveLength(2))
    expect(created.options[1]!.videoId).toBe('3psvNDHQv7Y')
    expect(created.options[1]!.playerVars.mute).toBe(0)
    expect(screen.getByRole('button', { name: /Clipe de Banda B/ })).toHaveAttribute('aria-current', 'true')
  })

  it('tem o formulário para sugerir um clipe', () => {
    renderWithProviders(<NowPlaying items={[a]} />)

    expect(screen.getByRole('heading', { name: 'Sugira um clipe' })).toBeInTheDocument()
  })

  it('com a preferência de menos movimento, espera o clique, e o clique toca com som', async () => {
    reducedMotion(true)
    renderWithProviders(<NowPlaying items={[a, b]} />)

    expect(created.options).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Tocar os clipes: Banda A, Banda B' }))

    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.playerVars.mute).toBe(0)
  })

  it('sem nenhum vídeo, mostra a capa da banda reserva e o caminho para a página dela', async () => {
    mockCover()
    renderWithProviders(<NowPlaying items={[]} coverClip={cover} />)

    expect(await screen.findByText('O clipe entra no ar em breve.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a banda' })).toHaveAttribute('href', '/artistas/banda-c')
    expect(screen.queryByRole('list', { name: 'Playlist' })).not.toBeInTheDocument()
    expect(created.options).toHaveLength(0)
  })

  it('sem vídeos e sem banda reserva, não mostra nada', () => {
    const { container } = renderWithProviders(<NowPlaying items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
