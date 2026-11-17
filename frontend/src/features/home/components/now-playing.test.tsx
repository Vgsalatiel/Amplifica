import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { artistDetail, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import type { Clip } from '../lib/clips'
import { NowPlaying } from './now-playing'

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

afterEach(() => vi.unstubAllGlobals())

describe('NowPlaying', () => {
  it('toca sozinho e sem som, com os outros clipes em seguida na mesma tela', () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(screen.getByText('E agora, confira as novidades.')).toBeInTheDocument()
    const frame = document.querySelector('iframe')!
    const url = new URL(frame.getAttribute('src')!)
    expect(url.origin + url.pathname).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('mute')).toBe('1')
    expect(url.searchParams.get('playlist')).toBe('3psvNDHQv7Y')
    expect(url.searchParams.get('loop')).toBe('1')
    expect(screen.getByText(/O vídeo começa sem som/)).toBeInTheDocument()
  })

  it('não tem fila, botões de trocar nem play: só a tela e os links das bandas', () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Banda A' })).toHaveAttribute('href', '/artistas/banda-a')
    expect(screen.getByRole('link', { name: 'Banda B' })).toHaveAttribute('href', '/artistas/banda-b')
  })

  it('pula os clipes sem link e usa só os que têm', () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[none, a]} />)

    const url = new URL(document.querySelector('iframe')!.getAttribute('src')!)
    expect(url.pathname).toBe('/embed/dQw4w9WgXcQ')
    expect(url.searchParams.get('playlist')).toBeNull()
  })

  it('com a preferência de menos movimento, espera o clique, e o clique toca com som', () => {
    reducedMotion(true)
    mockArtists()
    renderWithProviders(<NowPlaying clips={[a, b]} />)

    expect(document.querySelector('iframe')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tocar os clipes: Banda A, Banda B' }))

    const url = new URL(document.querySelector('iframe')!.getAttribute('src')!)
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('mute')).toBeNull()
  })

  it('sem nenhum link, mostra a capa da primeira banda e o caminho para a página dela', async () => {
    mockArtists()
    renderWithProviders(<NowPlaying clips={[none]} />)

    expect(await screen.findByText('O clipe entra no ar em breve.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a banda' })).toHaveAttribute('href', '/artistas/banda-c')
    expect(document.querySelector('iframe')).toBeNull()
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
