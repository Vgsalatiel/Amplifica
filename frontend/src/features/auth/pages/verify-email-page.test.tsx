import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { VerifyEmailPage } from './verify-email-page'

const routes = [
  { path: '/confirmar-email', element: <VerifyEmailPage /> },
  { path: '/lancamentos', element: <p>Lançamentos</p> },
  { path: '/entrar', element: <p>Tela de entrar</p> },
]

describe('VerifyEmailPage', () => {
  it('confirma uma única vez ao abrir o link, e tira o token da barra de endereço', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/verify-email': { status: 204 } })
    const { router } = renderRoutes(routes, '/confirmar-email?token=abc123token')

    expect(await screen.findByRole('heading', { name: 'E-mail confirmado' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    const verifyCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/verify-email'))
    expect(verifyCalls).toHaveLength(1)
    expect(JSON.parse(verifyCalls[0][1]?.body as string)).toEqual({ token: 'abc123token' })
  })

  it('quem está logado tem o aviso de confirmação removido na hora', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    mockApi({
      'POST /auth/verify-email': { status: 204 },
      'GET /auth/me': { status: 200, body: { ...testUser, needsEmailVerification: false } },
    })
    renderRoutes(routes, '/confirmar-email?token=ok')

    await screen.findByRole('heading', { name: 'E-mail confirmado' })
    const { sessionStore } = await import('../../../lib/session')
    await waitFor(() => {
      const state = sessionStore.getState()
      expect(state.status === 'authenticated' && state.user.needsEmailVerification).toBe(false)
    })
  })

  it('link vencido ou já usado: explica e orienta a pedir outro', async () => {
    endSession()
    mockApi({ 'POST /auth/verify-email': { status: 400, body: { statusCode: 400, code: 'invalid_token', message: 'Esse link venceu ou já foi usado. Peça um novo.' } } })
    renderRoutes(routes, '/confirmar-email?token=velho')

    expect(await screen.findByRole('alert')).toHaveTextContent('Esse link venceu, já foi usado ou está incompleto')
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
  })

  it('sem token, não chama a API e mostra o problema', () => {
    endSession()
    const fetchMock = mockApi({})
    renderRoutes(routes, '/confirmar-email')

    expect(screen.getByRole('heading', { name: 'Não foi possível confirmar' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('servidor fora do ar: diz que não respondeu, sem afirmar que o link é inválido', async () => {
    endSession()
    mockApi({ 'POST /auth/verify-email': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } } })
    renderRoutes(routes, '/confirmar-email?token=ok')

    expect(await screen.findByRole('alert')).toHaveTextContent('O servidor não respondeu')
  })
})
