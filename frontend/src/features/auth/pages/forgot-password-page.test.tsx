import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ForgotPasswordPage } from './forgot-password-page'

const routes = [
  { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
  { path: '/entrar', element: <p>Tela de entrar</p> },
]

describe('ForgotPasswordPage', () => {
  it('envia o e-mail e mostra a mesma confirmação, sem dizer se a conta existe', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/forgot-password': { status: 204 } })
    renderRoutes(routes, '/esqueci-a-senha')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' marina@exemplo.com ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Se existe uma conta com o e-mail marina@exemplo.com')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ email: 'marina@exemplo.com' })
    expect(screen.getByRole('link', { name: 'Voltar para entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('mostra o erro de formato que a API devolve no campo', async () => {
    mockApi({
      'POST /auth/forgot-password': {
        status: 400,
        body: { statusCode: 400, code: 'validation_failed', message: 'Dados inválidos.', details: [{ field: 'email', message: 'Digite um e-mail válido, como nome@exemplo.com.' }] },
      },
    })
    renderRoutes(routes, '/esqueci-a-senha')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'sem-arroba' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText('Digite um e-mail válido, como nome@exemplo.com.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explica quando o envio de e-mails está desligado no servidor', async () => {
    mockApi({
      'POST /auth/forgot-password': {
        status: 503,
        body: { statusCode: 503, code: 'email_unavailable', message: 'O envio de e-mails não está disponível agora.' },
      },
    })
    renderRoutes(routes, '/esqueci-a-senha')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O envio de e-mails não está disponível agora.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
