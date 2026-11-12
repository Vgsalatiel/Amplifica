import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { RegisterPage } from './register-page'

const EMAIL = 'Qual é o seu e-mail?'
const USERNAME = 'Como você quer ser chamado?'
const PASSWORD = 'Agora, crie uma senha.'

function renderRegister(from?: string) {
  endSession()
  const view = renderRoutes(
    [
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/u/:username', element: <p>Perfil criado</p> },
      { path: '/lancamentos/:slug', element: <p>Voltou ao disco</p> },
    ],
    '/cadastro',
  )
  if (from) {
    void view.router.navigate('/cadastro', { state: { from } })
  }
  return view
}

/** Preenche o campo do passo atual e avança. */
function answer(question: string, value: string, button = 'Continuar') {
  fireEvent.change(screen.getByLabelText(question), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: button }))
}

describe('RegisterPage', () => {
  it('percorre os três passos, cria a conta e leva ao perfil', async () => {
    const fetchMock = mockApi({ 'POST /auth/register': { status: 201, body: sessionFor() } })
    renderRegister()

    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
    answer(EMAIL, ' marina@exemplo.com ')

    expect(screen.getByRole('img', { name: 'Passo 2 de 3' })).toBeInTheDocument()
    answer(USERNAME, 'marina.fz')

    answer(PASSWORD, 'senha-segura', 'Criar conta')

    expect(await screen.findByText('Perfil criado')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      email: 'marina@exemplo.com',
      username: 'marina.fz',
      password: 'senha-segura',
    })
  })

  it('depois de criar a conta a partir de um disco, volta para ele', async () => {
    mockApi({ 'POST /auth/register': { status: 201, body: sessionFor() } })
    renderRegister('/lancamentos/sempiternal')

    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')
    answer(PASSWORD, 'senha-segura', 'Criar conta')

    expect(await screen.findByText('Voltou ao disco')).toBeInTheDocument()
  })

  it('ignora um destino que não seja uma página do próprio site', async () => {
    mockApi({ 'POST /auth/register': { status: 201, body: sessionFor() } })
    renderRegister('//site-malicioso.com')

    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')
    answer(PASSWORD, 'senha-segura', 'Criar conta')

    expect(await screen.findByText('Perfil criado')).toBeInTheDocument()
  })

  it('não avança com resposta inválida e explica o motivo no campo', () => {
    const fetchMock = mockApi({})
    renderRegister()

    answer(EMAIL, 'sem-arroba')

    expect(screen.getByLabelText(EMAIL)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(EMAIL)).toHaveAccessibleDescription(
      'Digite um e-mail válido, como nome@exemplo.com.',
    )
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leva o foco ao campo de cada passo', () => {
    renderRegister()
    expect(screen.getByLabelText(EMAIL)).toHaveFocus()

    answer(EMAIL, 'marina@exemplo.com')

    expect(screen.getByLabelText(USERNAME)).toHaveFocus()
  })

  it('permite voltar a um passo anterior sem perder o que foi digitado', () => {
    renderRegister()
    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')

    fireEvent.click(screen.getByRole('button', { name: '1. E-mail: marina@exemplo.com' }))
    expect(screen.getByLabelText(EMAIL)).toHaveValue('marina@exemplo.com')

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByLabelText(USERNAME)).toHaveValue('marina.fz')

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para o e-mail' }))
    expect(screen.getByLabelText(EMAIL)).toBeInTheDocument()
  })

  it('volta ao passo do campo que a API recusou, como e-mail já em uso', async () => {
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
    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')
    answer(PASSWORD, 'senha-segura', 'Criar conta')

    expect(await screen.findByText('Já existe uma conta com esse e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText(EMAIL)).toHaveAttribute('aria-invalid', 'true')
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    mockApi({})
    renderRegister()
    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')
    answer(PASSWORD, 'senha-segura', 'Criar conta')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor')
  })

  it('converte o nome de usuário para minúsculas enquanto a pessoa digita', () => {
    renderRegister()
    answer(EMAIL, 'marina@exemplo.com')

    fireEvent.change(screen.getByLabelText(USERNAME), { target: { value: 'Marina' } })

    expect(screen.getByLabelText(USERNAME)).toHaveValue('marina')
  })

  it('mostra e oculta a senha', () => {
    renderRegister()
    answer(EMAIL, 'marina@exemplo.com')
    answer(USERNAME, 'marina.fz')
    expect(screen.getByLabelText(PASSWORD)).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))

    expect(screen.getByLabelText(PASSWORD)).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true')
  })
})
