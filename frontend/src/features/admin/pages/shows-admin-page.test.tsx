import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Paginated, Show } from '../../../types/api'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ShowsAdminPage } from './shows-admin-page'

const show: Show = {
  id: 's1',
  slug: 'linkin-park-sao-paulo-2027-03-15',
  name: null,
  date: '2027-03-15',
  startTime: null,
  venue: 'Allianz Parque',
  city: 'São Paulo',
  state: 'SP',
  status: 'CONFIRMED',
  ticketUrl: null,
  verifiedAt: '2026-11-13T15:30:00.000Z',
  acts: [{ position: 0, name: 'Linkin Park', artist: null }],
  genres: [],
}
const page = (items: Show[]): Paginated<Show> => ({
  items,
  meta: { page: 1, limit: 20, total: items.length, totalPages: 1 },
})
const routes = [{ path: '/admin/shows', element: <ShowsAdminPage /> }]

describe('ShowsAdminPage', () => {
  it('lista os próximos shows com data, local e link para a edição', async () => {
    mockApi({
      'GET /shows?page=1&when=upcoming&limit=20': {
        status: 200,
        body: page([show]),
      },
    })
    renderRoutes(routes, '/admin/shows')

    const link = await screen.findByRole('link', { name: /Linkin Park/ })
    expect(link).toHaveAttribute('href', '/admin/shows/linkin-park-sao-paulo-2027-03-15')
    expect(link).toHaveTextContent('15/03/2027')
    expect(link).toHaveTextContent('Allianz Parque, São Paulo/SP')
    expect(screen.getByText('1 show')).toBeInTheDocument()
  })

  it('marca os que não estão confirmados', async () => {
    mockApi({
      'GET /shows?page=1&when=upcoming&limit=20': {
        status: 200,
        body: page([{ ...show, status: 'SOLD_OUT' }]),
      },
    })
    renderRoutes(routes, '/admin/shows')

    expect(await screen.findByText('Esgotado')).toBeInTheDocument()
  })

  it('troca o período e guarda a escolha na URL', async () => {
    mockApi({
      'GET /shows?page=1&when=upcoming&limit=20': {
        status: 200,
        body: page([show]),
      },
      'GET /shows?page=1&when=past&limit=20': { status: 200, body: page([]) },
    })
    const { router } = renderRoutes(routes, '/admin/shows')
    await screen.findByRole('link', { name: /Linkin Park/ })

    fireEvent.change(screen.getByLabelText('Período'), {
      target: { value: 'past' },
    })

    expect(await screen.findByText('Nenhum show com esses filtros.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?when=past')
  })

  it('pede os cancelados quando a pessoa escolhe essa situação', async () => {
    const fetchMock = mockApi({
      'GET /shows?page=1&when=upcoming&limit=20': {
        status: 200,
        body: page([show]),
      },
      'GET /shows?page=1&when=upcoming&status=CANCELLED&limit=20': {
        status: 200,
        body: page([{ ...show, status: 'CANCELLED' }]),
      },
    })
    renderRoutes(routes, '/admin/shows')
    await screen.findByRole('link', { name: /Linkin Park/ })

    fireEvent.change(screen.getByLabelText('Situação'), {
      target: { value: 'CANCELLED' },
    })

    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('orienta quando ainda não há shows', async () => {
    mockApi({
      'GET /shows?page=1&when=upcoming&limit=20': {
        status: 200,
        body: page([]),
      },
    })
    renderRoutes(routes, '/admin/shows')

    expect(await screen.findByText('Nenhum show cadastrado ainda. Cadastre o primeiro.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Novo show' })).toHaveAttribute('href', '/admin/shows/novo')
  })
})
