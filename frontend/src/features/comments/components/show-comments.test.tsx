import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../../test/helpers'
import type { ShowComment } from '../../../types/api'
import { ShowComments } from './show-comments'

const comment = (overrides: Partial<ShowComment> = {}): ShowComment => ({
  id: 'k1',
  body: 'Quem vai de ônibus?',
  createdAt: '2026-11-18T12:00:00.000Z',
  author: { username: 'bia', displayName: 'Bia Souza', avatar: null },
  ...overrides,
})
const BOARD = 'GET /shows/s1/comments'

describe('ShowComments', () => {
  it('visitante lê o mural e é convidado a entrar para comentar', async () => {
    endSession()
    mockApi({ [BOARD]: { status: 200, body: [comment()] } })
    renderWithProviders(<ShowComments slug="s1" />)

    expect(await screen.findByText('Quem vai de ônibus?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bia Souza' })).toHaveAttribute('href', '/u/bia')
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
    expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Denunciar' })).not.toBeInTheDocument()
  })

  it('mural vazio convida a primeira pessoa', async () => {
    endSession()
    mockApi({ [BOARD]: { status: 200, body: [] } })
    renderWithProviders(<ShowComments slug="s1" />)

    expect(await screen.findByText(/Ninguém comentou ainda/)).toBeInTheDocument()
  })

  it('pede para confirmar o e-mail antes de comentar', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    mockApi({ [BOARD]: { status: 200, body: [] } })
    renderWithProviders(<ShowComments slug="s1" />)

    expect(await screen.findByText(/confirme seu e-mail/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Seu comentário')).not.toBeInTheDocument()
  })

  it('publica o comentário, limpa o campo e mostra o novo mural', async () => {
    startSession(sessionFor())
    const fetchMock = mockApi({
      [BOARD]: [
        { status: 200, body: [] },
        { status: 200, body: [comment({ id: 'k2', body: 'Vou cedo!' })] },
      ],
      'POST /shows/s1/comments': { status: 201, body: comment({ id: 'k2', body: 'Vou cedo!' }) },
    })
    renderWithProviders(<ShowComments slug="s1" />)

    fireEvent.change(await screen.findByLabelText('Seu comentário'), { target: { value: '  Vou cedo!  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Vou cedo!', { selector: 'p' })).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]?.body))).toEqual({ body: 'Vou cedo!' })
    await waitFor(() => expect(screen.getByLabelText('Seu comentário')).toHaveValue(''))
  })

  it('mostra o erro da API, como o de links', async () => {
    startSession(sessionFor())
    mockApi({
      [BOARD]: { status: 200, body: [] },
      'POST /shows/s1/comments': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_error',
          message: 'Dados inválidos.',
          details: [{ field: 'body', message: 'Links não são permitidos no mural.' }],
        },
      },
    })
    renderWithProviders(<ShowComments slug="s1" />)

    fireEvent.change(await screen.findByLabelText('Seu comentário'), { target: { value: 'veja www.x.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Links não são permitidos no mural.')).toBeInTheDocument()
  })

  it('quem escreveu apaga o próprio e não vê "Denunciar" nele; nos dos outros vê só "Denunciar"', async () => {
    startSession(sessionFor({ ...testUser, username: 'bia' }))
    mockApi({
      [BOARD]: [
        {
          status: 200,
          body: [
            comment({ id: 'k1' }),
            comment({ id: 'k2', body: 'Outro', author: { username: 'ana', displayName: 'Ana', avatar: null } }),
          ],
        },
        { status: 200, body: [comment({ id: 'k2', body: 'Outro', author: { username: 'ana', displayName: 'Ana', avatar: null } })] },
      ],
      'DELETE /comments/k1': { status: 204 },
      'POST /comments/k2/reports': { status: 204 },
    })
    renderWithProviders(<ShowComments slug="s1" />)

    expect(await screen.findAllByRole('button', { name: 'Apagar' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Denunciar' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    expect(await screen.findByText(/Denúncia enviada/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    await waitFor(() => expect(screen.queryByText('Quem vai de ônibus?')).not.toBeInTheDocument())
  })

  it('moderador vê "Apagar" em qualquer comentário', async () => {
    startSession(sessionFor({ ...testUser, username: 'moda', role: 'MODERATOR' }))
    mockApi({ [BOARD]: { status: 200, body: [comment()] } })
    renderWithProviders(<ShowComments slug="s1" />)

    expect(await screen.findByRole('button', { name: 'Apagar' })).toBeInTheDocument()
  })
})
