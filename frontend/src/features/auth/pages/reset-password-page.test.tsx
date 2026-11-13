import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ResetPasswordPage } from './reset-password-page'

const routes = [
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/esqueci-a-senha', element: <p>Pedir link</p> },
  { path: '/entrar', element: <p>Tela de entrar</p> },
]

describe('ResetPasswordPage', () => {
  it('envia o token do link e a nova senha, e tira o token da barra de endereço', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/reset-password': { status: 204 } })
    const { router } = renderRoutes(routes, '/redefinir-senha?token=abc123token')

    await waitFor(() => expect(router.state.location.search).toBe(''))
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('heading', { name: 'Senha alterada' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('desconectado de todos os aparelhos')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ token: 'abc123token', password: 'senha-nova-456' })
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('sem token na URL, explica que o link está incompleto e oferece pedir outro', () => {
    renderRoutes(routes, '/redefinir-senha')

    expect(screen.getByRole('alert')).toHaveTextContent('Esse link está incompleto')
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute('href', '/esqueci-a-senha')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })

  it('link vencido ou já usado: diz isso e oferece pedir um novo', async () => {
    mockApi({ 'POST /auth/reset-password': { status: 400, body: { statusCode: 400, code: 'invalid_token', message: 'Esse link venceu ou já foi usado. Peça um novo.' } } })
    renderRoutes(routes, '/redefinir-senha?token=velho')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText(/Esse link venceu ou já foi usado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toBeInTheDocument()
  })

  it('senha fraca: mostra o erro no campo e mantém o formulário', async () => {
    mockApi({
      'POST /auth/reset-password': {
        status: 400,
        body: { statusCode: 400, code: 'validation_failed', message: 'Dados inválidos.', details: [{ field: 'password', message: 'A senha precisa de pelo menos 8 caracteres.' }] },
      },
    })
    renderRoutes(routes, '/redefinir-senha?token=ok')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('A senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-invalid', 'true')
  })
})
