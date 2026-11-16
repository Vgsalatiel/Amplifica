import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Paginated, Show } from '../../../types/api'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { genreDetail, show } from '../../../test/fixtures'
import { ShowsPage } from './shows-page'

const page = (items: Show[], totalPages = 1): Paginated<Show> => ({
  items,
  meta: { page: 1, limit: 50, total: items.length, totalPages },
})
const tree = [{ ...genreDetail(), children: [] }].map(({ id, name, slug, description, parentId, children }) => ({
  id,
  name,
  slug,
  description,
  parentId,
  children,
}))
const routes = [{ path: '/shows', element: <ShowsPage /> }]

const march = show({ id: 's1', date: '2027-03-15', acts: [{ position: 0, name: 'Linkin Park', artist: null }] })
const marchLater = show({ id: 's2', date: '2027-03-20', acts: [{ position: 0, name: 'Paramore', artist: null }] })
const april = show({ id: 's3', date: '2027-04-02', acts: [{ position: 0, name: 'Slipknot', artist: null }] })

describe('ShowsPage', () => {
  it('lista os próximos shows agrupados por mês, sem exigir login', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&limit=50': { status: 200, body: page([march, marchLater, april]) },
    })
    renderRoutes(routes, '/shows')

    expect(await screen.findByRole('heading', { level: 2, name: 'março de 2027' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'abril de 2027' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Slipknot' })).toBeInTheDocument()
    expect(screen.getByText('3 shows')).toBeInTheDocument()
    expect(screen.getByText(/Confirme sempre no link do vendedor/)).toBeInTheDocument()
  })

  it('filtra por estado e guarda o filtro na URL', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&limit=50': { status: 200, body: page([march, april]) },
      'GET /shows?page=1&state=PR&limit=50': { status: 200, body: page([april]) },
    })
    const { router } = renderRoutes(routes, '/shows')
    await screen.findByRole('heading', { level: 3, name: 'Linkin Park' })

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'PR' } })

    expect(await screen.findByText('1 show')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Linkin Park' })).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?estado=PR')
  })

  it('lê o filtro de gênero da URL', async () => {
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&genre=metal&limit=50': { status: 200, body: page([april]) },
    })
    renderRoutes(routes, '/shows?genero=metal')

    expect(await screen.findByRole('heading', { level: 3, name: 'Slipknot' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/shows?page=1&genre=metal&limit=50', expect.anything())
  })

  it('com filtros sem resultado, avisa e oferece ver todos', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&state=AC&limit=50': { status: 200, body: page([]) },
    })
    renderRoutes(routes, '/shows?estado=AC')

    expect(await screen.findByText('Nenhum show encontrado com esses filtros.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos os shows' })).toHaveAttribute('href', '/shows')
  })

  it('sem nenhum show cadastrado, avisa sem falar em filtros', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&limit=50': { status: 200, body: page([]) },
    })
    renderRoutes(routes, '/shows')

    expect(await screen.findByText('Nenhum show marcado por enquanto.')).toBeInTheDocument()
  })

  it('explica quando o servidor não responde, com opção de tentar de novo', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /shows?page=1&limit=50': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'x' } },
    })
    renderRoutes(routes, '/shows')

    expect(await screen.findByText('Não foi possível carregar os shows')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
