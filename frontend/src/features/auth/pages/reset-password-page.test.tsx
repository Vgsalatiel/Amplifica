import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ResetPasswordPage } from './reset-password-page'

const routes = [
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  { path: '/esqueci-a-senha', element: <p>Pedir código</p> },
  { path: '/entrar', element: <p>Tela de entrar</p> },
]

const invalidCode = { status: 400, body: { statusCode: 400, code: 'invalid_code', message: 'O código está errado ou venceu.' } }

function typeCode(value: string) {
  fireEvent.change(screen.getByLabelText('Código'), { target: { value } })
  // Com os 6 números, a tela confere sozinha; o botão só é preciso se faltar algum.
  if (value.length < 6) fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('ResetPasswordPage', () => {
  it('três passos: o código, depois a nova senha em dois campos, depois o aviso', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/reset-password/check': { status: 204 }, 'POST /auth/reset-password': { status: 204 } })
    renderRoutes([{ ...routes[0]! }, ...routes.slice(1)], '/redefinir-senha')

    // Sem e-mail vindo da tela anterior, a pessoa digita o e-mail junto com o código.
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' marina@exemplo.com ' } })
    typeCode('048213')

    expect(await screen.findByRole('heading', { name: 'Escolha uma nova senha' })).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ email: 'marina@exemplo.com', code: '048213' })

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('heading', { name: 'Senha alterada' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('desconectado de todos os aparelhos')
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      email: 'marina@exemplo.com',
      code: '048213',
      password: 'senha-nova-456',
    })
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
  })

  it('vindo do pedido do código, o e-mail já está preenchido e não é pedido de novo', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/reset-password/check': { status: 204 } })
    const { router } = renderRoutes(routes, '/')
    await router.navigate('/redefinir-senha', { state: { email: 'ana@exemplo.com' } })

    expect(await screen.findByText(/enviamos um código de 6 números/)).toHaveTextContent('ana@exemplo.com')
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    typeCode('123456')
    await screen.findByRole('heading', { name: 'Escolha uma nova senha' })
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ email: 'ana@exemplo.com', code: '123456' })
  })

  it('ao digitar o 6º número, confere o código sozinha e abre a nova senha, sem clicar em Continuar', async () => {
    endSession()
    const fetchMock = mockApi({ 'POST /auth/reset-password/check': { status: 204 } })
    renderRoutes(routes, '/redefinir-senha')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })

    fireEvent.change(screen.getByLabelText('Código'), { target: { value: '12345' } })
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: '123456' } })

    expect(await screen.findByRole('heading', { name: 'Escolha uma nova senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Repita a nova senha')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('o campo do código só aceita números', () => {
    renderRoutes(routes, '/redefinir-senha')
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: '12ab34' } })
    expect(screen.getByLabelText('Código')).toHaveValue('1234')
  })

  it('código errado ou vencido: avisa e deixa tentar de novo ou pedir outro', async () => {
    mockApi({ 'POST /auth/reset-password/check': invalidCode })
    renderRoutes(routes, '/redefinir-senha')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
    typeCode('000000')

    expect(await screen.findByRole('alert')).toHaveTextContent('O código está errado ou venceu')
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo código' })).toHaveAttribute('href', '/esqueci-a-senha')
  })

  it('as duas senhas precisam ser iguais: nada é enviado se forem diferentes', async () => {
    const fetchMock = mockApi({ 'POST /auth/reset-password/check': { status: 204 }, 'POST /auth/reset-password': { status: 204 } })
    renderRoutes(routes, '/redefinir-senha')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
    typeCode('111111')
    await screen.findByLabelText('Nova senha')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'outra-coisa-789' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('As duas senhas precisam ser iguais.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('senha fraca: mostra o erro no campo e mantém o formulário', async () => {
    mockApi({
      'POST /auth/reset-password/check': { status: 204 },
      'POST /auth/reset-password': {
        status: 400,
        body: { statusCode: 400, code: 'validation_failed', message: 'Dados inválidos.', details: [{ field: 'password', message: 'A senha precisa de pelo menos 8 caracteres.' }] },
      },
    })
    renderRoutes(routes, '/redefinir-senha')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
    typeCode('222222')
    await screen.findByLabelText('Nova senha')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('A senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-invalid', 'true')
  })

  it('se o código vence enquanto a pessoa escolhe a senha, oferece pedir um novo', async () => {
    mockApi({ 'POST /auth/reset-password/check': { status: 204 }, 'POST /auth/reset-password': invalidCode })
    renderRoutes(routes, '/redefinir-senha')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
    typeCode('333333')
    await screen.findByLabelText('Nova senha')

    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'senha-nova-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText(/O código venceu ou já foi usado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo código' })).toBeInTheDocument()
  })
})
