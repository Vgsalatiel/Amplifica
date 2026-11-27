import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { FollowButton } from './follow-button'

const routes = [
  { path: '/u/bia', element: <FollowButton username="bia" displayName="Bia" /> },
  { path: '/u/marina.fz', element: <FollowButton username="marina.fz" displayName="Marina F." /> },
  { path: '/entrar', element: <p>Tela de login</p> },
]

describe('FollowButton', () => {
  it('para o visitante, leva a entrar e volta para o perfil depois', () => {
    endSession()
    const { router } = renderRoutes(routes, '/u/bia')

    fireEvent.click(screen.getByRole('link', { name: /Seguir/ }))

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/u/bia' })
  })

  it('segue na hora, e o segundo clique deixa de seguir', async () => {
    endSession()
    startSession(sessionFor())
    const fetchMock = mockApi({
      'GET /users/bia/follow': [
        { status: 200, body: { following: false } },
        { status: 200, body: { following: true } },
        { status: 200, body: { following: false } },
      ],
      'PUT /users/bia/follow': { status: 200, body: { following: true } },
      'DELETE /users/bia/follow': { status: 204 },
    })
    renderRoutes(routes, '/u/bia')

    const button = await screen.findByRole('button', { name: /Seguir/ })
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    const following = await screen.findByRole('button', { name: /Seguindo/ })
    expect(following).toHaveAttribute('aria-pressed', 'true')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)

    fireEvent.click(following)
    expect(await screen.findByRole('button', { name: /Seguir/ })).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
  })

  it('no próprio perfil, o botão não aparece', async () => {
    endSession()
    startSession(sessionFor(testUser))
    mockApi({})
    const { container } = renderRoutes(routes, `/u/${testUser.username}`)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('se o servidor recusar, volta ao que era e avisa', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({
      'GET /users/bia/follow': { status: 200, body: { following: false } },
      'PUT /users/bia/follow': { status: 409, body: { statusCode: 409, code: 'following_limit', message: 'Limite.' } },
    })
    renderRoutes(routes, '/u/bia')

    const button = await screen.findByRole('button', { name: /Seguir/ })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
    expect(await screen.findByRole('button', { name: /Seguir/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
