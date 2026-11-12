import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../../test/helpers'
import { page, review } from '../../../test/fixtures'
import { ReviewsSection } from './reviews-section'

const LIST = 'GET /releases/sempiternal/reviews?page=1'

describe('ReviewsSection', () => {
  it('lista as resenhas com autor, nota e data, e liga ao perfil de quem escreveu', async () => {
    endSession()
    mockApi({ [LIST]: { status: 200, body: page([review(), review({ id: 'rv2', rating: 4, body: 'Esperava mais.', edited: true, author: { username: 'beto', displayName: 'Beto', avatar: null } })]) } })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    expect(await screen.findByText('Um disco que mudou a banda.')).toBeInTheDocument()
    expect(screen.getByText('9/10')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ana Souza' })).toHaveAttribute('href', '/u/ana')
    expect(screen.getAllByText(/10 de novembro de 2026/)).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Beto' }).parentElement).toHaveTextContent('editada')
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('sem resenhas, explica que ainda não há nenhuma', async () => {
    endSession()
    mockApi({ [LIST]: { status: 200, body: page([]) } })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    expect(await screen.findByText(/Ainda não há resenhas escritas/)).toBeInTheDocument()
  })

  it('pagina as resenhas', async () => {
    endSession()
    mockApi({
      [LIST]: { status: 200, body: page([review()], { totalPages: 2, total: 11 }) },
      'GET /releases/sempiternal/reviews?page=2': { status: 200, body: page([review({ id: 'rv9', body: 'Segunda página.' })], { page: 2, totalPages: 2, total: 11 }) },
    })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    await screen.findByText('Um disco que mudou a banda.')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('Segunda página.')).toBeInTheDocument()
  })

  it('administrador remove a resenha de outra pessoa', async () => {
    startSession(sessionFor({ ...testUser, role: 'ADMIN' }))
    const fetchMock = mockApi({
      [LIST]: { status: 200, body: page([review()]) },
      'DELETE /reviews/rv1': { status: 204 },
    })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    await screen.findByText('Um disco que mudou a banda.')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(screen.getByText(/Excluir a avaliação de Ana Souza\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/reviews/rv1', expect.objectContaining({ method: 'DELETE' })))
  })

  it('quem não é administrador não vê o botão de remover', async () => {
    startSession(sessionFor())
    mockApi({ [LIST]: { status: 200, body: page([review()]) } })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    await screen.findByText('Um disco que mudou a banda.')
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('oferece tentar de novo quando a lista falha', async () => {
    endSession()
    mockApi({ [LIST]: { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } } })
    renderWithProviders(<ReviewsSection slug="sempiternal" />)

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
