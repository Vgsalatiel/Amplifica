import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { show } from '../../../test/fixtures'
import { mockApi, renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { ShowPage } from './show-page'

const SLUG = 'linkin-park-sao-paulo-2027-03-15'
const open = () => renderRoutes([{ path: '/shows/:slug', element: <ShowPage /> }], `/shows/${SLUG}`)
const none = { status: 200, body: { count: 0, going: [] } }

describe('ShowPage', () => {
  it('mostra o show, o ingresso e o total de quem vai, convidando o visitante a entrar', async () => {
    endSession()
    mockApi({
      [`GET /shows/${SLUG}`]: { status: 200, body: show({ startTime: '20:30', organizerName: 'Emo Tour' }) },
      [`GET /shows/${SLUG}/attendance`]: { status: 200, body: { count: 3, going: [] } },
    })
    open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByText(/20h30/)).toBeInTheDocument()
    expect(screen.getByText(/Allianz Parque, São Paulo\/SP/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Comprar ingresso/ })).toHaveAttribute(
      'href',
      'https://ingressos.exemplo.test/lp',
    )
    expect(await screen.findByText('3 pessoas vão.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
    expect(screen.queryByRole('button', { name: 'Eu vou' })).not.toBeInTheDocument()
    expect(document.title).toBe('Linkin Park | Amplifica')
  })

  it('lista só os nomes que a API devolve, com link para o perfil', async () => {
    endSession()
    mockApi({
      [`GET /shows/${SLUG}`]: { status: 200, body: show() },
      [`GET /shows/${SLUG}/attendance`]: {
        status: 200,
        body: { count: 5, going: [{ username: 'bia', displayName: 'Bia Souza', avatar: null }] },
      },
    })
    open()

    expect(await screen.findByText('5 pessoas vão.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bia Souza' })).toHaveAttribute('href', '/u/bia')
  })

  it('pede para confirmar o e-mail antes de marcar presença', async () => {
    startSession(sessionFor({ ...testUser, needsEmailVerification: true }))
    mockApi({
      [`GET /shows/${SLUG}`]: { status: 200, body: show() },
      [`GET /shows/${SLUG}/attendance`]: none,
    })
    open()

    expect(await screen.findByText(/confirme seu e-mail/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eu vou' })).not.toBeInTheDocument()
  })

  it('marca presença sem mostrar o nome, depois liga o nome e desmarca', async () => {
    startSession(sessionFor())
    const me = `GET /shows/${SLUG}/attendance/me`
    const fetchMock = mockApi({
      [`GET /shows/${SLUG}`]: { status: 200, body: show() },
      [`GET /shows/${SLUG}/attendance`]: none,
      [me]: [
        { status: 200, body: { going: false, showName: false } },
        { status: 200, body: { going: true, showName: false } },
        { status: 200, body: { going: true, showName: true } },
        { status: 200, body: { going: false, showName: false } },
      ],
      [`PUT /shows/${SLUG}/attendance/me`]: { status: 200, body: { going: true, showName: false } },
      [`DELETE /shows/${SLUG}/attendance/me`]: { status: 204 },
    })
    open()

    fireEvent.click(await screen.findByRole('button', { name: 'Eu vou' }))
    expect(await screen.findByText('Você vai a este show.')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ showName: false })

    const checkbox = screen.getByRole('checkbox', { name: /Mostrar meu nome/ })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Mostrar meu nome/ })).toBeChecked())
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(puts[1]?.[1]?.body))).toEqual({ showName: true })

    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar presença' }))
    expect(await screen.findByRole('button', { name: 'Eu vou' })).toBeInTheDocument()
  })

  it('show que já passou não aceita presença', async () => {
    startSession(sessionFor())
    mockApi({
      [`GET /shows/${SLUG}`]: { status: 200, body: show({ date: '2026-01-10' }) },
      [`GET /shows/${SLUG}/attendance`]: none,
    })
    open()

    expect(await screen.findByText(/só pode ser marcada em shows que ainda vão acontecer/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eu vou' })).not.toBeInTheDocument()
  })

  it('show que não existe mostra a mensagem com volta para a agenda', async () => {
    endSession()
    mockApi({ [`GET /shows/${SLUG}`]: { status: 404, body: { code: 'show_not_found', message: 'Esse show não existe.' } } })
    open()

    expect(await screen.findByText('Esse show não existe')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a agenda' })).toHaveAttribute('href', '/shows')
  })
})
