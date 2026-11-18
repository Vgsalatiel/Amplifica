import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../../test/helpers'
import { ClipSuggestForm } from './clip-suggest-form'

const myClip = (overrides = {}) => ({
  id: 'm1',
  youtubeId: 'dQw4w9WgXcQ',
  title: 'Meu clipe',
  channelName: 'Canal',
  status: 'PENDING',
  createdAt: '2026-11-17T12:00:00.000Z',
  ...overrides,
})

function typeAndSend(link: string) {
  fireEvent.change(screen.getByLabelText('Link do clipe no YouTube'), { target: { value: link } })
  fireEvent.click(screen.getByRole('button', { name: 'Sugerir clipe' }))
}

describe('ClipSuggestForm', () => {
  it('convida o visitante a entrar ou criar conta, sem mostrar o formulário', () => {
    endSession()
    renderWithProviders(<ClipSuggestForm />)

    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
    expect(screen.getByRole('link', { name: 'crie uma' })).toHaveAttribute('href', '/cadastro')
    expect(screen.queryByLabelText('Link do clipe no YouTube')).not.toBeInTheDocument()
  })

  it('pede para confirmar o e-mail antes de sugerir', () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    renderWithProviders(<ClipSuggestForm />)

    expect(screen.getByText(/confirme seu e-mail/)).toHaveTextContent('marina@exemplo.com')
    expect(screen.queryByLabelText('Link do clipe no YouTube')).not.toBeInTheDocument()
  })

  it('envia o link sem espaços, limpa o campo e avisa que depende da aprovação', async () => {
    startSession(sessionFor())
    const fetchMock = mockApi({
      'GET /clips/mine': { status: 200, body: [] },
      'POST /clips': { status: 201, body: myClip() },
    })
    renderWithProviders(<ClipSuggestForm />)

    typeAndSend('  https://youtu.be/dQw4w9WgXcQ  ')

    expect(
      await screen.findByText(/Enviado! Ele entra na playlist depois que um administrador aprovar/),
    ).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]?.body as string)).toEqual({ url: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(screen.getByLabelText('Link do clipe no YouTube')).toHaveValue('')
  })

  it('o botão só liga com algo digitado', () => {
    startSession(sessionFor())
    mockApi({ 'GET /clips/mine': { status: 200, body: [] } })
    renderWithProviders(<ClipSuggestForm />)

    expect(screen.getByRole('button', { name: 'Sugerir clipe' })).toBeDisabled()
  })

  it('mostra o erro do campo quando o link não serve, e o erro geral quando bate o limite do dia', async () => {
    startSession(sessionFor())
    mockApi({
      'GET /clips/mine': { status: 200, body: [] },
      'POST /clips': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'invalid_clip_link',
          message: 'Cole o link de um vídeo do YouTube.',
          details: [{ field: 'url', message: 'Esse não é um link de vídeo do YouTube.' }],
        },
      },
    })
    const { unmount } = renderWithProviders(<ClipSuggestForm />)

    typeAndSend('https://exemplo.com')

    expect(await screen.findByText('Esse não é um link de vídeo do YouTube.')).toBeInTheDocument()
    unmount()

    mockApi({
      'GET /clips/mine': { status: 200, body: [] },
      'POST /clips': {
        status: 429,
        body: {
          statusCode: 429,
          code: 'clip_limit_reached',
          message: 'Você já sugeriu 3 clipes nas últimas 24 horas.',
        },
      },
    })
    renderWithProviders(<ClipSuggestForm />)
    typeAndSend('https://youtu.be/dQw4w9WgXcQ')

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já sugeriu 3 clipes nas últimas 24 horas.')
  })

  it('lista as sugestões que ainda aguardam aprovação, e só elas', async () => {
    startSession(sessionFor())
    mockApi({
      'GET /clips/mine': {
        status: 200,
        body: [
          myClip(),
          myClip({ id: 'm2', title: 'Já aprovado', status: 'APPROVED' }),
          myClip({ id: 'm3', title: 'Recusado', status: 'REJECTED' }),
        ],
      },
    })
    renderWithProviders(<ClipSuggestForm />)

    expect(await screen.findByText('Meu clipe')).toBeInTheDocument()
    expect(screen.getByText(/aguardando aprovação/)).toBeInTheDocument()
    expect(screen.queryByText('Já aprovado')).not.toBeInTheDocument()
    expect(screen.queryByText('Recusado')).not.toBeInTheDocument()
  })
})
