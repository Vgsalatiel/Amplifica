import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { artistDetail, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import type { Clip } from '../lib/clips'
import { NowPlaying } from './now-playing'

const created = vi.hoisted(() => ({
  options: [] as Array<{ videoId: string; playerVars: Record<string, string | number> }>,
}))

vi.mock('../../../lib/youtube-api', () => ({
  loadYouTubeApi: () =>
    Promise.resolve({
      PlayerState: { ENDED: 0, PLAYING: 1 },
      Player: class {
        constructor(_element: HTMLElement, options: (typeof created.options)[number]) {
          created.options.push(options)
        }
        loadVideoById() {}
        destroy() {}
        getIframe() {
          return document.createElement('iframe')
        }
      },
    }),
}))

const a: Clip = {
  id: 'a',
  artistSlug: 'banda-a',
  band: 'Banda A',
  title: null,
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
}
const b: Clip = {
  id: 'b',
  artistSlug: 'banda-b',
  band: 'Banda B',
  title: null,
  youtube: 'https://youtu.be/3psvNDHQv7Y',
}
const none: Clip = { id: 'c', artistSlug: 'banda-c', band: 'Banda C', title: null, youtube: null }

function mockArtists() {
  mockApi({
    'GET /artists/banda-a': { status: 200, body: artistDetail({ slug: 'banda-a', name: 'Banda A' }) },
    'GET /artists/banda-c': {
      status: 200,
      body: artistDetail({ slug: 'banda-c', name: 'Banda C', releases: [releaseSummary()] }),
    },
  })
}

function reducedMotion(value: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: value && query.includes('reduce'), media: query }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  created.options.length = 0
})

describe('NowPlaying', () => {
  it('toca sozinho e sem som, com todos os clipes que têm link na mesma tela', async () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(screen.getByText('E agora, confira as novidades.')).toBeInTheDocument()
    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.videoId).toBe('dQw4w9WgXcQ')
    expect(created.options[0]!.playerVars).toMatchObject({ autoplay: 1, mute: 1 })
    expect(screen.getByText(/O vídeo começa sem som/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo clipe' })).toBeInTheDocument()
  })

  it('tem os links das bandas e não tem fila nem botão de play', () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Banda A' })).toHaveAttribute('href', '/artistas/banda-a')
    expect(screen.getByRole('link', { name: 'Banda B' })).toHaveAttribute('href', '/artistas/banda-b')
  })

  it('pula os clipes sem link e usa só os que têm', async () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[none, a]} />)

    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.videoId).toBe('dQw4w9WgXcQ')
    expect(screen.queryByRole('button', { name: 'Próximo clipe' })).not.toBeInTheDocument()
  })

  it('com a preferência de menos movimento, espera o clique, e o clique toca com som', async () => {
    reducedMotion(true)
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(created.options).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Tocar os clipes: Banda A, Banda B' }))

    await vi.waitFor(() => expect(created.options).toHaveLength(1))
    expect(created.options[0]!.playerVars.mute).toBe(0)
  })

  it('sem nenhum link, mostra a capa da primeira banda e o caminho para a página dela', async () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[none]} />)

    expect(await screen.findByText('O clipe entra no ar em breve.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a banda' })).toHaveAttribute('href', '/artistas/banda-c')
    expect(created.options).toHaveLength(0)
  })

  it('um link que não é do YouTube não quebra a tela', async () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[{ ...a, youtube: 'https://exemplo.com/video' }]} />)

    expect(await screen.findByText('O clipe entra no ar em breve.')).toBeInTheDocument()
  })

  it('sem clipes, não mostra nada', () => {
    const { container } = renderWithProviders(<NowPlaying clips={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
