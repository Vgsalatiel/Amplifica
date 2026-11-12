import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { artistSummary, page, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { SearchPage } from './search-page'

const routes = [{ path: '/buscar', element: <SearchPage /> }]
const open = (q = 'bring') => renderRoutes(routes, `/buscar?q=${encodeURIComponent(q)}`)
const ARTISTS = 'GET /artists?q=bring&page=1&limit=8'
const RELEASES = 'GET /releases?q=bring&page=1&limit=8'

describe('SearchPage', () => {
  it('mostra artistas e lançamentos encontrados, cada um com o seu total', async () => {
    mockApi({
      [ARTISTS]: { status: 200, body: page([artistSummary()]) },
      [RELEASES]: { status: 200, body: page([releaseSummary({ rating: { average: 8, count: 3 } })]) },
    })
    open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Resultados para “bring”' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Artistas (1)' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Lançamentos (1)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nota 8 de 10' })).toBeInTheDocument()
  })

  it('esconde a seção que não tem resultado', async () => {
    mockApi({
      [ARTISTS]: { status: 200, body: page([]) },
      [RELEASES]: { status: 200, body: page([releaseSummary()]) },
    })
    open()

    expect(await screen.findByRole('heading', { name: 'Lançamentos (1)' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Artistas/ })).not.toBeInTheDocument()
  })

  it('sem resultado nenhum, explica e sugere caminhos', async () => {
    mockApi({
      [ARTISTS]: { status: 200, body: page([]) },
      [RELEASES]: { status: 200, body: page([]) },
    })
    open()

    expect(await screen.findByText(/Nada encontrado para “bring”/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'artistas' })).toHaveAttribute('href', '/artistas')
    expect(screen.getByRole('link', { name: 'lançamentos' })).toHaveAttribute('href', '/lancamentos')
  })

  it('sem texto na busca, orienta e não consulta a API', () => {
    const fetchMock = mockApi({})
    renderRoutes(routes, '/buscar')

    expect(screen.getByText(/Digite o nome de um artista ou de um disco/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('oferece tentar de novo quando a busca falha', async () => {
    mockApi({
      [ARTISTS]: { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } },
      [RELEASES]: { status: 200, body: page([]) },
    })
    open()

    expect(await screen.findByRole('button', { name: 'Tentar de novo' }, { timeout: 4000 })).toBeInTheDocument()
  })

  it('pagina os artistas sem mexer na página dos lançamentos', async () => {
    mockApi({
      [ARTISTS]: { status: 200, body: page([artistSummary()], { totalPages: 2, total: 9, limit: 8 }) },
      'GET /artists?q=bring&page=2&limit=8': {
        status: 200,
        body: page([artistSummary({ id: 'a2', name: 'Bring Outra', slug: 'bring-outra' })], { page: 2, totalPages: 2, total: 9, limit: 8 }),
      },
      [RELEASES]: { status: 200, body: page([releaseSummary()]) },
    })
    const { router } = open()

    fireEvent.click(await screen.findByRole('button', { name: 'Próxima' }))

    expect(await screen.findByRole('link', { name: /Bring Outra/ })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=bring&pa=2')
  })
})
