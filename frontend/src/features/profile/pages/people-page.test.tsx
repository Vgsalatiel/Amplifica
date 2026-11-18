import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { PeoplePage } from './people-page'

const routes = [{ path: '/pessoas', element: <PeoplePage /> }]
const person = (username: string, displayName: string) => ({
  username,
  displayName,
  bio: null,
  avatar: null,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('PeoplePage', () => {
  it('sem busca, só mostra o campo', () => {
    mockApi({})
    renderRoutes(routes, '/pessoas')

    expect(screen.getByRole('heading', { level: 1, name: 'Pessoas' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('busca e lista as pessoas com link para o perfil', async () => {
    mockApi({ 'GET /users/search?q=ana': { status: 200, body: [person('ana', 'Ana Souza'), person('ana.b', 'Ana B')] } })
    renderRoutes(routes, '/pessoas')

    fireEvent.change(screen.getByLabelText('Nome ou @usuario'), { target: { value: ' ana ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    const link = await screen.findByRole('link', { name: /Ana Souza/ })
    expect(link).toHaveAttribute('href', '/u/ana')
    expect(screen.getByRole('link', { name: /Ana B/ })).toHaveAttribute('href', '/u/ana.b')
  })

  it('avisa quando ninguém é encontrado', async () => {
    mockApi({ 'GET /users/search?q=zzz': { status: 200, body: [] } })
    renderRoutes(routes, '/pessoas?q=zzz')

    expect(await screen.findByText(/Ninguém encontrado para “zzz”/)).toBeInTheDocument()
  })

  it('uma letra só pede mais letras e não chama a API', () => {
    const fetchMock = mockApi({})
    renderRoutes(routes, '/pessoas?q=a')

    expect(screen.getByText('Digite pelo menos 2 letras.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('o @ na frente do nome é ignorado, no campo e na URL', async () => {
    mockApi({ 'GET /users/search?q=ana': { status: 200, body: [person('ana', 'Ana Souza')] } })
    renderRoutes(routes, '/pessoas')

    fireEvent.change(screen.getByLabelText('Nome ou @usuario'), { target: { value: '@ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByRole('link', { name: /Ana Souza/ })).toHaveAttribute('href', '/u/ana')

    mockApi({ 'GET /users/search?q=ana': { status: 200, body: [person('ana', 'Ana Souza')] } })
    renderRoutes(routes, '/pessoas?q=%40ana')
    expect((await screen.findAllByRole('link', { name: /Ana Souza/ })).length).toBeGreaterThan(0)
  })
})
