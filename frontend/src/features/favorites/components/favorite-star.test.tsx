import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { FavoriteStar } from './favorite-star'

const routes = [
  { path: '/artistas/fresno', element: <FavoriteStar slug="fresno" name="Fresno" /> },
  { path: '/entrar', element: <p>Tela de login</p> },
]

describe('FavoriteStar', () => {
  it('para o visitante, leva a entrar e volta para a banda depois', () => {
    endSession()
    const { router } = renderRoutes(routes, '/artistas/fresno')

    fireEvent.click(screen.getByRole('link', { name: 'Entre para marcar Fresno como favorita' }))

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/artistas/fresno' })
  })

  it('um clique marca como favorita na hora, e outro clique tira', async () => {
    endSession()
    startSession(sessionFor())
    // O servidor responde com o estado de verdade a cada nova consulta: sem estrela, com estrela, sem estrela.
    const fetchMock = mockApi({
      'GET /artists/fresno/favorite': [
        { status: 200, body: { favorite: false } },
        { status: 200, body: { favorite: true } },
        { status: 200, body: { favorite: false } },
      ],
      'PUT /artists/fresno/favorite': { status: 200, body: { favorite: true } },
      'DELETE /artists/fresno/favorite': { status: 204 },
    })
    renderRoutes(routes, '/artistas/fresno')

    const star = await screen.findByRole('button', { name: 'Marcar Fresno como favorita' })
    await waitFor(() => expect(star).toBeEnabled())
    expect(star).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(star)
    const marked = await screen.findByRole('button', { name: 'Tirar Fresno das favoritas' })
    expect(marked).toHaveAttribute('aria-pressed', 'true')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)

    fireEvent.click(marked)
    expect(await screen.findByRole('button', { name: 'Marcar Fresno como favorita' })).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
  })

  it('já mostra a estrela marcada para quem favoritou antes', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({ 'GET /artists/fresno/favorite': { status: 200, body: { favorite: true } } })
    renderRoutes(routes, '/artistas/fresno')

    expect(await screen.findByRole('button', { name: 'Tirar Fresno das favoritas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('se o servidor recusar, a estrela volta ao que era e avisa', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({
      'GET /artists/fresno/favorite': { status: 200, body: { favorite: false } },
      'PUT /artists/fresno/favorite': { status: 409, body: { statusCode: 409, code: 'favorites_limit', message: 'Limite.' } },
    })
    renderRoutes(routes, '/artistas/fresno')

    const star = await screen.findByRole('button', { name: 'Marcar Fresno como favorita' })
    await waitFor(() => expect(star).toBeEnabled())
    fireEvent.click(star)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
    expect(await screen.findByRole('button', { name: 'Marcar Fresno como favorita' })).toHaveAttribute('aria-pressed', 'false')
  })
})
