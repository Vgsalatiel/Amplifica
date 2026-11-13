import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, sessionStore } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { LoginPage } from './login-page'

function renderLogin(state?: unknown) {
  endSession()
  const view = renderRoutes(
    [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/', element: <p>Página inicial</p> },
      { path: '/conta', element: <p>Sua conta</p> },
    ],
    '/entrar',
  )
  if (state) {
    void view.router.navigate('/entrar', { state })
  }
  return view
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' marina@exemplo.com ' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage', () => {
  it('entra, guarda a sessão e vai para o início', async () => {
    const fetchMock = mockApi({ 'POST /auth/login': { status: 200, body: sessionFor() } })
    renderLogin()

    fillAndSubmit()

    expect(await screen.findByText('Página inicial')).toBeInTheDocument()
    expect(sessionStore.getState()).toEqual({ status: 'authenticated', user: testUser })
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      email: 'marina@exemplo.com',
      password: 'senha-segura',
    })
  })

  it('mostra a mensagem da API quando a senha está errada', async () => {
    mockApi({
      'POST /auth/login': {
        status: 401,
        body: { statusCode: 401, code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' },
      },
    })
    renderLogin()

    fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(sessionStore.getState()).toEqual({ status: 'anonymous' })
  })

  it('volta para a página protegida que a pessoa tentou abrir', async () => {
    mockApi({ 'POST /auth/login': { status: 200, body: sessionFor() } })
    renderLogin({ from: '/conta' })

    fillAndSubmit()

    expect(await screen.findByText('Sua conta')).toBeInTheDocument()
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    mockApi({})
    renderLogin()

    fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor')
  })

  it('oferece o caminho para quem esqueceu a senha', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-a-senha')
  })
})
