import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayInBrazil } from '../../../lib/format-date'
import { endSession } from '../../../lib/session'
import { artistSummary, page, releaseDetail, show } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { BRAZIL_FEATURED_RELEASES } from '../lib/brazil-featured'
import { BrazilScenePage } from './brazil-scene-page'

const open = () => renderRoutes([{ path: '/cena-br', element: <BrazilScenePage /> }], '/cena-br')

const emoTour = {
  'GET /shows?organizer=Emo+Tour&limit=20': { status: 200, body: page([show({ organizerName: 'Emo Tour' })]) },
}
const notFound = {
  status: 404,
  body: { statusCode: 404, code: 'release_not_found', message: 'Esse lançamento não existe.' },
}

const thisYear = todayInBrazil().slice(0, 4)

describe('BrazilScenePage', () => {
  it('mostra os discos em destaque ao lado do título e todas as bandas brasileiras, sem exigir login', async () => {
    endSession()
    const [first, second, third, fourth] = BRAZIL_FEATURED_RELEASES
    mockApi({
      ...emoTour,
      [`GET /releases/${first}`]: {
        status: 200,
        body: releaseDetail({ slug: first, title: 'Carta de Adeus', releaseDate: `${thisYear}-04-24` }),
      },
      // Um disco que ainda não está no catálogo é pulado, sem derrubar os outros.
      [`GET /releases/${second}`]: notFound,
      [`GET /releases/${third}`]: {
        status: 200,
        body: releaseDetail({ slug: third, title: 'O AGORA QUE COBRA VIVER', releaseDate: `${thisYear}-05-29` }),
      },
      [`GET /releases/${fourth}`]: {
        status: 200,
        body: releaseDetail({ slug: fourth, title: 'Labirinto da memória', releaseDate: '2024-01-12' }),
      },
      'GET /artists?country=BR&page=1&limit=24': {
        status: 200,
        body: page([artistSummary({ id: 'a2', name: 'Banda Antiga', slug: 'banda-antiga' })]),
      },
    })
    open()

    expect(screen.getByRole('heading', { level: 1, name: 'Cena BR' })).toBeInTheDocument()
    const featured = await screen.findByRole('list', { name: 'Discos em destaque' })
    expect(await within(featured).findByRole('link', { name: /Carta de Adeus/ })).toHaveAttribute(
      'href',
      `/lancamentos/${first}`,
    )
    expect(within(featured).getByRole('link', { name: /O AGORA QUE COBRA VIVER/ })).toBeInTheDocument()
    expect(within(featured).getByRole('link', { name: /Labirinto da memória/ })).toBeInTheDocument()
    expect(within(featured).getAllByRole('link')).toHaveLength(3)
    // Só os discos lançados neste ano levam o selo.
    expect(within(featured).getAllByText('NOVO')).toHaveLength(2)

    expect(await screen.findByRole('link', { name: /Banda Antiga/ })).toHaveAttribute('href', '/artistas/banda-antiga')
    expect(screen.getByText('1 banda')).toBeInTheDocument()
    expect(screen.queryByText('Bandas novas')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emo Tour: 1 evento. Ver todos' })).toHaveAttribute('href', '/emo-tour')
    expect(document.title).toBe('Cena BR | Amplifica')
  })

  it('se nenhum dos discos em destaque existe no catálogo, a seção some em vez de mostrar cartões vazios', async () => {
    endSession()
    mockApi({
      ...emoTour,
      ...Object.fromEntries(BRAZIL_FEATURED_RELEASES.map((slug) => [`GET /releases/${slug}`, notFound])),
      'GET /artists?country=BR&page=1&limit=24': { status: 200, body: page([artistSummary()]) },
    })
    open()

    expect(await screen.findByRole('link', { name: /Bring Me the Horizon/ })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Discos em destaque' })).not.toBeInTheDocument()
  })

  it('sem bandas cadastradas, avisa', async () => {
    endSession()
    mockApi({
      ...emoTour,
      'GET /artists?country=BR&page=1&limit=24': { status: 200, body: page([]) },
    })
    open()

    expect(await screen.findByText('Nenhuma banda brasileira cadastrada ainda.')).toBeInTheDocument()
  })
})
