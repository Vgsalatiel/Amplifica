import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../../test/helpers'
import { ShowGroups } from './show-groups'

const LIST = 'GET /shows/s1/groups'
const group = { id: 'g1', platform: 'WHATSAPP', url: 'https://chat.whatsapp.com/AbCdEf123' }

describe('ShowGroups', () => {
  it('mostra os grupos aprovados como link externo seguro e avisa que são de terceiros', async () => {
    endSession()
    mockApi({ [LIST]: { status: 200, body: [group] } })
    renderWithProviders(<ShowGroups slug="s1" open />)

    const link = await screen.findByRole('link', { name: /Grupo no WhatsApp/ })
    expect(link).toHaveAttribute('href', group.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.getByText(/Ficam fora do Amplifica/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
  })

  it('sem grupos, avisa; show encerrado não oferece sugestão', async () => {
    startSession(sessionFor())
    mockApi({ [LIST]: { status: 200, body: [] } })
    renderWithProviders(<ShowGroups slug="s1" open={false} />)

    expect(await screen.findByText(/Nenhum grupo aprovado/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Link de convite do grupo')).not.toBeInTheDocument()
  })

  it('pede para confirmar o e-mail antes de sugerir', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    mockApi({ [LIST]: { status: 200, body: [] } })
    renderWithProviders(<ShowGroups slug="s1" open />)

    expect(await screen.findByText(/confirme seu e-mail/)).toBeInTheDocument()
  })

  it('envia a sugestão, limpa o campo e avisa que depende da aprovação', async () => {
    startSession(sessionFor())
    const fetchMock = mockApi({
      [LIST]: { status: 200, body: [] },
      'POST /shows/s1/groups': { status: 201, body: { ...group, status: 'PENDING' } },
    })
    renderWithProviders(<ShowGroups slug="s1" open />)

    const field = await screen.findByLabelText('Link de convite do grupo')
    fireEvent.change(field, { target: { value: `  ${group.url}  ` } })
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir grupo' }))

    expect(await screen.findByText(/depois que a moderação aprovar/)).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(String(post[1]?.body))).toEqual({ url: group.url })
    expect(field).toHaveValue('')
  })

  it('mostra o erro da API para um link que não é convite', async () => {
    startSession(sessionFor())
    mockApi({
      [LIST]: { status: 200, body: [] },
      'POST /shows/s1/groups': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'invalid_group_link',
          message: 'Use o link de convite.',
          details: [{ field: 'url', message: 'Esse não é um link de convite do WhatsApp, Telegram ou Discord.' }],
        },
      },
    })
    renderWithProviders(<ShowGroups slug="s1" open />)

    fireEvent.change(await screen.findByLabelText('Link de convite do grupo'), {
      target: { value: 'https://instagram.com/x' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sugerir grupo' }))

    expect(await screen.findByText(/Esse não é um link de convite/)).toBeInTheDocument()
  })

  it('só a moderação vê o botão de remover', async () => {
    startSession(sessionFor({ ...testUser, role: 'MODERATOR' }))
    mockApi({ [LIST]: { status: 200, body: [group] } })
    renderWithProviders(<ShowGroups slug="s1" open />)

    expect(await screen.findByRole('button', { name: /Remover grupo do WhatsApp/ })).toBeInTheDocument()
  })

  it('usuário comum não vê o botão de remover', async () => {
    startSession(sessionFor())
    mockApi({ [LIST]: { status: 200, body: [group] } })
    renderWithProviders(<ShowGroups slug="s1" open />)

    await screen.findByRole('link', { name: /Grupo no WhatsApp/ })
    expect(screen.queryByRole('button', { name: /Remover grupo/ })).not.toBeInTheDocument()
  })
})
