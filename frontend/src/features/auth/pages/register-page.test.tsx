import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { RegisterPage } from './register-page'

function renderRegister() {
  endSession()
  return renderRoutes(
    [
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/u/:username', element: <p>Perfil criado</p> },
    ],
    '/cadastro',
  )
}

function fill(email: string, username: string, password: string) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Nome de usuário'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
}

describe('RegisterPage', () => {
  it('cria a conta e leva ao perfil', async () => {
    mockApi({ 'POST /auth/register': { status: 201, body: sessionFor() } })
    renderRegister()

    fill('marina@exemplo.com', 'marina.fz', 'senha-segura')

    expect(await screen.findByText('Perfil criado')).toBeInTheDocument()
  })

  it('aponta os campos inválidos sem chamar a API', () => {
    const fetchMock = mockApi({})
    renderRegister()

    fill('sem-arroba', 'ab', '123')

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nome de usuário')).toHaveAccessibleDescription(
      'O nome de usuário precisa de pelo menos 3 caracteres.',
    )
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mostra no campo o erro que só a API conhece, como e-mail já em uso', async () => {
    mockApi({
      'POST /auth/register': {
        status: 409,
        body: {
          statusCode: 409,
          code: 'account_taken',
          message: 'E-mail ou nome de usuário já em uso.',
          details: [{ field: 'email', message: 'Já existe uma conta com esse e-mail.' }],
        },
      },
    })
    renderRegister()

    fill('marina@exemplo.com', 'marina.fz', 'senha-segura')

    expect(await screen.findByText('Já existe uma conta com esse e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('converte o nome de usuário para minúsculas enquanto a pessoa digita', () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText('Nome de usuário'), { target: { value: 'Marina' } })

    expect(screen.getByLabelText('Nome de usuário')).toHaveValue('marina')
  })
})
