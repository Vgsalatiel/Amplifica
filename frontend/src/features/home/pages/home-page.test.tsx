import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { artistDetail, genreNode, page, releaseSummary, show } from '../../../test/fixtures'
import { HomePage } from './home-page'

const open = () => renderRoutes([{ path: '/', element: <HomePage /> }], '/')

const empty = { status: 200, body: page([]) }
/** Respostas vazias para tudo o que a página pede; cada teste troca só o que importa. */
const base = {
  'GET /releases?limit=8': empty,
  'GET /shows?limit=4': empty,
  'GET /releases?country=BR&released=past&sort=recent&limit=12': empty,
  'GET /releases?anniversary=5%2C10%2C15%2C20%2C25%2C30%2C35%2C40&sort=recent&limit=12': empty,
  'GET /releases?sort=rating&limit=5': empty,
  'GET /genres': { status: 200, body: [] },
  'GET /clips?limit=500': empty,
  'GET /artists/bullet-bane': { status: 200, body: artistDetail({ slug: 'bullet-bane', name: 'Bullet Bane' }) },
  'GET /artists/fresno': { status: 200, body: artistDetail({ slug: 'fresno', name: 'Fresno' }) },
}

describe('HomePage', () => {
  it('mostra lançamentos recentes e gêneros', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?limit=8': { status: 200, body: page([releaseSummary()]) },
      'GET /genres': { status: 200, body: [genreNode('emo', 'Emo')] },
    })
    open()

    const recent = await screen.findByRole('region', { name: 'Lançamentos recentes' })
    expect(within(recent).getByRole('link', { name: /Sempiternal/ })).toHaveAttribute(
      'href',
      '/lancamentos/bring-me-the-horizon-sempiternal',
    )
    expect(await screen.findByRole('link', { name: 'Emo' })).toHaveAttribute('href', '/generos/emo')
  })

  it('a playlist vem da API, e os clipes aprovados aparecem na lista', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /clips?limit=500': {
        status: 200,
        body: [
          {
            id: 'c1',
            youtubeId: '3psvNDHQv7Y',
            title: 'Clipe da banda nova',
            channelName: 'Canal',
            pinned: false,
            artist: null,
            suggestedBy: { username: 'ana', displayName: 'Ana' },
            createdAt: '2026-11-17T12:00:00.000Z',
          },
        ],
      },
    })
    open()

    const playlist = await screen.findByRole('list', { name: 'Playlist' })
    expect(within(playlist).getByText('Clipe da banda nova')).toBeInTheDocument()
    expect(within(playlist).getByText(/sugerido por @ana/)).toBeInTheDocument()
  })

  it('se a playlist da API vem vazia ou falha, vale a lista reserva de clips.ts', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /clips?limit=500': { status: 404, body: { statusCode: 404, code: 'not_found', message: 'x' } },
    })
    open()

    const playlist = await screen.findByRole('list', { name: 'Playlist' })
    expect(within(playlist).getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('abre com o "Agora na tela" e a mensagem principal', async () => {
    endSession()
    mockApi(base)
    open()

    expect(await screen.findByRole('heading', { level: 2, name: 'Agora na tela' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AUMENTE O VOLUME. ENTRE NA CENA.')
  })

  it('mostra os próximos shows com link para a agenda completa', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /shows?limit=4': {
        status: 200,
        body: page([show({ id: 's1' }), show({ id: 's2', acts: [{ position: 0, name: 'Rush', artist: null }] })]),
      },
    })
    open()

    const shows = await screen.findByRole('region', { name: 'Grade de shows' })
    expect(within(shows).getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(within(shows).getByRole('heading', { level: 3, name: 'Rush' })).toBeInTheDocument()
    expect(within(shows).getByRole('link', { name: 'Ver a agenda completa' })).toHaveAttribute('href', '/shows')
  })

  it('mostra a cena BR como prateleira de discos, com links para a história e para todas as bandas', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?country=BR&released=past&sort=recent&limit=12': {
        status: 200,
        body: page([
          releaseSummary({
            id: 'br1',
            title: 'Rugby Japonês',
            slug: 'amandinho-rugby-japones',
            artists: [{ id: 'a9', name: 'Amandinho', slug: 'amandinho', role: 'PRIMARY' }],
          }),
        ]),
      },
    })
    open()

    const scene = await screen.findByRole('region', { name: 'Cena BR' })
    const shelf = within(scene).getByRole('list', { name: 'Discos da cena BR' })
    expect(within(shelf).getByRole('link', { name: /Rugby Japonês/ })).toHaveAttribute(
      'href',
      '/lancamentos/amandinho-rugby-japones',
    )
    expect(within(scene).getByRole('link', { name: 'Ver a história da cena' })).toHaveAttribute(
      'href',
      '/cena-br/historia',
    )
    expect(within(scene).getByRole('link', { name: 'Ver todas as bandas brasileiras' })).toHaveAttribute(
      'href',
      '/cena-br',
    )
  })

  it('mostra os aniversários de discos do mês, com quantos anos cada um faz', async () => {
    endSession()
    const year = new Date().getFullYear() - 10
    mockApi({
      ...base,
      'GET /releases?anniversary=5%2C10%2C15%2C20%2C25%2C30%2C35%2C40&sort=recent&limit=12': {
        status: 200,
        body: page([releaseSummary({ id: 'an1', title: 'Disco de dez anos', releaseDate: `${year}-11-04` })]),
      },
    })
    open()

    const section = await screen.findByRole('region', { name: /Aniversários de/ })
    expect(within(section).getByText('Faz 10 anos')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /Disco de dez anos/ })).toBeInTheDocument()
  })

  it('mostra os mais bem avaliados só com discos que têm nota', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?sort=rating&limit=5': {
        status: 200,
        body: page([
          releaseSummary({ id: 'n1', title: 'Disco nota', rating: { average: 4.5, count: 3 } }),
          releaseSummary({ id: 'n2', title: 'Disco sem nota', rating: { average: null, count: 0 } }),
        ]),
      },
    })
    open()

    const section = await screen.findByRole('region', { name: 'Mais bem avaliados' })
    expect(within(section).getByRole('link', { name: /Disco nota/ })).toBeInTheDocument()
    expect(within(section).queryByText('Disco sem nota')).not.toBeInTheDocument()
  })

  it('a faixa rosa corre em loop, leva à agenda e tem botão de pausar; o texto fica escondido de leitores de tela', async () => {
    endSession()
    mockApi({ ...base, 'GET /shows?limit=4': { status: 200, body: page([show({ id: 's1' })]) } })
    const { container } = open()

    await screen.findByRole('region', { name: 'Grade de shows' })
    expect(screen.getByRole('link', { name: /Na agenda: 1 evento/ })).toHaveAttribute('href', '/shows')
    expect(screen.getByRole('button', { name: 'Pausar faixa' })).toBeInTheDocument()
    const marquee = container.querySelector('[aria-hidden="true"].animate-marquee')
    expect(marquee).toHaveTextContent('Na agenda')
    expect(marquee).toHaveTextContent('Linkin Park, 15 de março')
    expect(marquee?.children).toHaveLength(2)
  })

  it('funciona com o catálogo vazio, sem seções vazias', async () => {
    endSession()
    mockApi(base)
    open()

    await screen.findByRole('heading', { level: 1 })
    for (const name of ['Lançamentos recentes', 'Grade de shows', 'Cena BR', 'Mais bem avaliados', 'Explore por gênero']) {
      expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument()
    }
  })

  it('se a agenda de shows falha, o resto da página continua funcionando', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?limit=8': { status: 200, body: page([releaseSummary()]) },
      'GET /shows?limit=4': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'x' } },
    })
    open()

    expect(await screen.findByRole('region', { name: 'Lançamentos recentes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Grade de shows' })).not.toBeInTheDocument()
  })
})
