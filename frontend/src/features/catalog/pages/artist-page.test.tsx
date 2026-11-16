import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { artistDetail, notFound, show } from '../../../test/fixtures'
import { ArtistPage } from './artist-page'

const open = (slug = 'bring-me-the-horizon') =>
  renderRoutes([{ path: '/artistas/:slug', element: <ArtistPage /> }], `/artistas/${slug}`)

describe('ArtistPage', () => {
  it('mostra o nome, os fatos conhecidos e os gêneros como links', async () => {
    endSession()
    mockApi({ 'GET /artists/bring-me-the-horizon': { status: 200, body: artistDetail() } })
    open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Bring Me the Horizon' })).toBeInTheDocument()
    expect(screen.getByText('Banda, Sheffield, Reino Unido, desde 2004')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Gêneros' })).getByRole('link', { name: 'Metalcore' })).toHaveAttribute(
      'href',
      '/generos/metalcore',
    )
  })

  it('mostra a história em parágrafos e as fontes em links externos seguros', async () => {
    endSession()
    mockApi({ 'GET /artists/x': { status: 200, body: artistDetail() } })
    open('x')

    expect(await screen.findByText('Primeiro parágrafo da história.')).toBeInTheDocument()
    expect(screen.getByText('Segundo parágrafo da história.')).toBeInTheDocument()
    const source = screen.getByRole('link', { name: 'MusicBrainz' })
    expect(source).toHaveAttribute('href', 'https://musicbrainz.org/artist/1')
    expect(source).toHaveAttribute('target', '_blank')
    expect(source).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('não transforma em link uma fonte que não seja http(s)', async () => {
    endSession()
    mockApi({
      'GET /artists/x': {
        status: 200,
        body: artistDetail({
          sources: [
            { name: 'Perigosa', url: 'javascript:alert(1)' },
            { name: 'Boa', url: 'https://exemplo.com' },
          ],
        }),
      },
    })
    open('x')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Perigosa' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Boa' })).toBeInTheDocument()
  })

  it('agrupa a discografia por tipo, com links para cada disco', async () => {
    endSession()
    mockApi({ 'GET /artists/x': { status: 200, body: artistDetail() } })
    open('x')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('heading', { name: /Álbuns \(3\)/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ao vivo \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /amo/ })).toHaveAttribute('href', '/lancamentos/amo')
    // Disco sem capa continua aparecendo.
    expect(screen.getByRole('img', { name: 'Count Your Blessings (sem capa)' })).toBeInTheDocument()
  })

  it('para artista encerrado, mostra o intervalo de anos', async () => {
    endSession()
    mockApi({ 'GET /artists/x': { status: 200, body: artistDetail({ disbandedYear: 2019 }) } })
    open('x')

    expect(await screen.findByText(/2004 a 2019/)).toBeInTheDocument()
  })

  it('sem história, gêneros ou foto, mostra só o que existe', async () => {
    endSession()
    mockApi({ 'GET /artists/x': { status: 200, body: artistDetail({ bio: null, sources: [], genres: [], releases: [], city: null, country: null, formedYear: null }) } })
    open('x')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'História' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Gêneros' })).not.toBeInTheDocument()
    expect(screen.getByText(/Nenhum lançamento cadastrado/)).toBeInTheDocument()
  })

  it('muda o título da aba e explica quando o artista não existe', async () => {
    endSession()
    mockApi({ 'GET /artists/x': { status: 200, body: artistDetail() } })
    const { unmount } = open('x')
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe('Bring Me the Horizon | Amplifica')
    unmount()

    mockApi({ 'GET /artists/nada': notFound })
    open('nada')
    expect(await screen.findByRole('heading', { name: 'Esse artista não existe' })).toBeInTheDocument()
  })

  it('mostra os próximos shows da banda, com link para a agenda completa', async () => {
    endSession()
    mockApi({
      'GET /artists/x': { status: 200, body: artistDetail() },
      'GET /shows?artist=bring-me-the-horizon&limit=10': {
        status: 200,
        body: { items: [show({ id: 's9' })], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      },
    })
    open('x')

    expect(await screen.findByRole('heading', { level: 2, name: 'Próximos shows' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a agenda completa' })).toHaveAttribute('href', '/shows')
  })

  it('sem shows marcados, a página não mostra a seção', async () => {
    endSession()
    mockApi({
      'GET /artists/x': { status: 200, body: artistDetail() },
      'GET /shows?artist=bring-me-the-horizon&limit=10': {
        status: 200,
        body: { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } },
      },
    })
    open('x')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Próximos shows' })).not.toBeInTheDocument()
  })
})
