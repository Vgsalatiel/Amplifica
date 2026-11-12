import { fireEvent, screen } from '@testing-library/react'
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
})
