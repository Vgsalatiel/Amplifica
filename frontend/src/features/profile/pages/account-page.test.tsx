import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sessionStore, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../../test/helpers'
import { AccountPage } from './account-page'

describe('AccountPage', () => {
  it('salva o perfil e atualiza o usuário da sessão', async () => {
    startSession(sessionFor())
    const updated = { ...testUser, displayName: 'Marina Faz', bio: 'Ouço discos inteiros.' }
    const fetchMock = mockApi({ 'PATCH /users/me': { status: 200, body: updated } })
    renderWithProviders(<AccountPage />)

    fireEvent.change(screen.getByLabelText('Nome de exibição'), { target: { value: 'Marina Faz' } })
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Ouço discos inteiros.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument()
    expect(sessionStore.getState()).toEqual({ status: 'authenticated', user: updated })
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      displayName: 'Marina Faz',
      bio: 'Ouço discos inteiros.',
    })
  })

  it('mostra o erro de validação no campo', async () => {
    startSession(sessionFor())
    mockApi({
      'PATCH /users/me': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_error',
          message: 'Confira os campos destacados.',
          details: [{ field: 'displayName', message: 'Digite um nome de exibição.' }],
        },
      },
    })
    renderWithProviders(<AccountPage />)

    fireEvent.change(screen.getByLabelText('Nome de exibição'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Digite um nome de exibição.')).toBeInTheDocument()
  })
  describe('excluir a conta', () => {
    it('pede a senha, exclui, encerra a sessão e volta para o início', async () => {
      startSession(sessionFor())
      const fetchMock = mockApi({ 'POST /auth/delete-account': { status: 204 } })
      const { router } = renderWithProviders(<AccountPage />, '/conta')

      expect(screen.queryByLabelText('Digite sua senha para confirmar')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
      const button = screen.getByRole('button', { name: 'Excluir minha conta para sempre' })
      expect(button).toBeDisabled()

      fireEvent.change(screen.getByLabelText('Digite sua senha para confirmar'), { target: { value: 'minha-senha-123' } })
      fireEvent.click(button)

      await waitFor(() => expect(sessionStore.getState()).toEqual({ status: 'anonymous' }))
      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ password: 'minha-senha-123' })
      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    })

    it('senha errada mostra o erro no campo e mantém a sessão', async () => {
      startSession(sessionFor())
      mockApi({
        'POST /auth/delete-account': {
          status: 400,
          body: {
            statusCode: 400,
            code: 'invalid_password',
            message: 'Senha incorreta.',
            details: [{ field: 'password', message: 'Senha incorreta.' }],
          },
        },
      })
      renderWithProviders(<AccountPage />, '/conta')

      fireEvent.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
      fireEvent.change(screen.getByLabelText('Digite sua senha para confirmar'), { target: { value: 'errada-000' } })
      fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta para sempre' }))

      expect(await screen.findByText('Senha incorreta.', { selector: 'p:not([role=alert])' })).toBeInTheDocument()
      expect(sessionStore.getState().status).toBe('authenticated')
    })

    it('cancelar fecha o formulário sem chamar a API', () => {
      startSession(sessionFor())
      const fetchMock = mockApi({})
      renderWithProviders(<AccountPage />, '/conta')

      fireEvent.click(screen.getByRole('button', { name: 'Quero excluir minha conta' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.getByRole('button', { name: 'Quero excluir minha conta' })).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('administrador vê o aviso em vez do botão', () => {
      startSession(sessionFor({ ...testUser, role: 'ADMIN' }))
      renderWithProviders(<AccountPage />, '/conta')

      expect(screen.getByText(/Administradores não podem excluir/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Quero excluir minha conta' })).not.toBeInTheDocument()
    })
  })
})
