import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { artistSummary, genreNode, page, releaseSummary, show } from '../../../test/fixtures'
import { HomePage } from './home-page'

const open = () => renderRoutes([{ path: '/', element: <HomePage /> }], '/')

const empty = { status: 200, body: page([]) }
/** Respostas vazias para tudo o que a página pede; cada teste troca só o que importa. */
const base = {
  'GET /releases?sort=rating&limit=14': empty,
  'GET /releases?limit=8': empty,
  'GET /shows?limit=5': empty,
  'GET /artists?limit=8': empty,
  'GET /genres': { status: 200, body: [] },
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
    expect(screen.getByRole('link', { name: 'Ver os artistas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver os shows' })).toHaveAttribute('href', '/shows')
  })

  it('abre com o mural de capas dos discos em destaque', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?sort=rating&limit=14': {
        status: 200,
        body: page([releaseSummary({ accentColor: '#C2410C' })]),
      },
    })
    open()

    const mural = await screen.findByRole('list', { name: 'Discos em destaque' })
    const link = within(mural).getByRole('link', { name: 'Sempiternal, Bring Me the Horizon' })
    expect(link).toHaveAttribute('href', '/lancamentos/bring-me-the-horizon-sempiternal')
    expect(link.querySelector('img')!.getAttribute('style')).toMatch(/color-mix\(.*rgb\(194, 65, 12\)/)
  })

  it('sem discos com capa, a abertura fica só com o texto', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?sort=rating&limit=14': { status: 200, body: page([releaseSummary({ cover: null })]) },
    })
    open()

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('list', { name: 'Discos em destaque' })).not.toBeInTheDocument()
  })

  it('mostra os próximos shows com link para a agenda completa', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /shows?limit=5': {
        status: 200,
        body: page([show({ id: 's1' }), show({ id: 's2', acts: [{ position: 0, name: 'Rush', artist: null }] })]),
      },
    })
    open()

    const shows = await screen.findByRole('region', { name: 'Próximos shows' })
    expect(within(shows).getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(within(shows).getByRole('heading', { level: 3, name: 'Rush' })).toBeInTheDocument()
    expect(within(shows).getByRole('link', { name: 'Ver a agenda completa' })).toHaveAttribute('href', '/shows')
  })

  it('mostra as bandas do catálogo', async () => {
    endSession()
    mockApi({ ...base, 'GET /artists?limit=8': { status: 200, body: page([artistSummary()]) } })
    open()

    const bands = await screen.findByRole('region', { name: 'Bandas' })
    expect(within(bands).getByRole('link', { name: /Bring Me the Horizon/ })).toHaveAttribute(
      'href',
      '/artistas/bring-me-the-horizon',
    )
    expect(within(bands).getByRole('link', { name: 'Ver todos os artistas' })).toHaveAttribute('href', '/artistas')
  })

  it('o visitante vê o convite para criar conta; quem já tem conta, não', async () => {
    endSession()
    mockApi(base)
    const { unmount } = open()
    expect(await screen.findByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    unmount()

    startSession(sessionFor())
    mockApi(base)
    open()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
  })

  it('funciona com o catálogo vazio, sem seções vazias', async () => {
    endSession()
    mockApi(base)
    open()

    await screen.findByRole('heading', { level: 1 })
    for (const name of ['Lançamentos recentes', 'Próximos shows', 'Bandas', 'Explore por gênero']) {
      expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument()
    }
  })

  it('se a agenda de shows falha, o resto da página continua funcionando', async () => {
    endSession()
    mockApi({
      ...base,
      'GET /releases?limit=8': { status: 200, body: page([releaseSummary()]) },
      'GET /shows?limit=5': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'x' } },
    })
    open()

    expect(await screen.findByRole('region', { name: 'Lançamentos recentes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Próximos shows' })).not.toBeInTheDocument()
  })
})
