import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { artistSummary, page } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import type { ReviewClip } from '../../../types/api'
import { ClipsModerationPage } from './clips-moderation-page'

const clip = (overrides: Partial<ReviewClip> = {}): ReviewClip => ({
  id: 'c1',
  youtubeId: 'dQw4w9WgXcQ',
  title: 'Clipe da banda nova',
  channelName: 'Canal da Banda',
  pinned: false,
  artist: null,
  suggestedBy: { username: 'ana', displayName: 'Ana' },
  createdAt: '2026-11-17T12:00:00.000Z',
  status: 'PENDING',
  reviewedAt: null,
  ...overrides,
})

const routes = [{ path: '/moderacao/clipes', element: <ClipsModerationPage /> }]
const none = { status: 200, body: [] }
const notFound = { status: 404, body: { statusCode: 404, code: 'clip_not_found', message: 'Esse clipe não existe.' } }

const patchOf = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!

describe('ClipsModerationPage', () => {
  it('abre nos pendentes, com título, canal, quem sugeriu e o link para ver o vídeo no YouTube', async () => {
    mockApi({ 'GET /clips/review?status=PENDING': { status: 200, body: [clip()] } })
    renderRoutes(routes, '/moderacao/clipes')

    expect(await screen.findByText('Clipe da banda nova')).toBeInTheDocument()
    expect(screen.getByText(/Canal da Banda · sugerido por @ana · 17\/11\/2026/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Abrir no YouTube/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Pendentes (1)' })).toHaveAttribute('aria-current', 'page')
  })

  it('aprovar manda o PATCH, avisa e tira o clipe da fila', async () => {
    const fetchMock = mockApi({
      'GET /clips/review?status=PENDING': [
        { status: 200, body: [clip()] },
        { status: 200, body: [] },
      ],
      'PATCH /clips/c1': { status: 200, body: clip({ status: 'APPROVED' }) },
    })
    renderRoutes(routes, '/moderacao/clipes')

    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))

    expect(await screen.findByText('Aprovado: Clipe da banda nova')).toBeInTheDocument()
    expect(JSON.parse(patchOf(fetchMock)[1]?.body as string)).toEqual({ status: 'APPROVED' })
    expect(await screen.findByText(/Nenhuma sugestão esperando/)).toBeInTheDocument()
  })

  it('aprovar ligando a uma banda do catálogo manda o artistId', async () => {
    const fetchMock = mockApi({
      'GET /clips/review?status=PENDING': { status: 200, body: [clip()] },
      'GET /artists?q=fres&limit=6': {
        status: 200,
        body: page([artistSummary({ id: 'a-fresno', name: 'Fresno', slug: 'fresno' })]),
      },
      'PATCH /clips/c1': { status: 200, body: clip({ status: 'APPROVED' }) },
    })
    renderRoutes(routes, '/moderacao/clipes')
    await screen.findByText('Clipe da banda nova')

    fireEvent.change(screen.getByLabelText('Buscar banda pelo nome'), { target: { value: 'fres' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Escolher Fresno' }))
    expect(screen.getByText(/Fresno/, { selector: 'p' })).toHaveTextContent('Fresno (nova)')
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))

    await screen.findByText('Aprovado: Clipe da banda nova')
    expect(JSON.parse(patchOf(fetchMock)[1]?.body as string)).toEqual({ status: 'APPROVED', artistId: 'a-fresno' })
  })

  it('recusar manda REJECTED', async () => {
    const fetchMock = mockApi({
      'GET /clips/review?status=PENDING': { status: 200, body: [clip()] },
      'PATCH /clips/c1': { status: 200, body: clip({ status: 'REJECTED' }) },
    })
    renderRoutes(routes, '/moderacao/clipes')

    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))

    expect(await screen.findByText('Recusado: Clipe da banda nova')).toBeInTheDocument()
    expect(JSON.parse(patchOf(fetchMock)[1]?.body as string)).toEqual({ status: 'REJECTED' })
  })

  it('remover pede confirmação antes de apagar', async () => {
    const fetchMock = mockApi({
      'GET /clips/review?status=PENDING': [
        { status: 200, body: [clip()] },
        { status: 200, body: [] },
      ],
      'DELETE /clips/c1': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/clipes')

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByText('Removido: Clipe da banda nova')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/clips/c1') && init?.method === 'DELETE'),
    ).toBe(true)
  })

  it('na aba de aprovados mostra o selo "fixo", não tem Aprovar e deixa recusar ou salvar a banda', async () => {
    mockApi({
      'GET /clips/review?status=PENDING': none,
      'GET /clips/review?status=APPROVED': {
        status: 200,
        body: [
          clip({ pinned: true, status: 'APPROVED', suggestedBy: null, artist: { slug: 'fresno', name: 'Fresno' } }),
        ],
      },
    })
    renderRoutes(routes, '/moderacao/clipes?situacao=APPROVED')

    expect(await screen.findByText('fixo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar banda' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aprovados' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Pendentes (0)' })).toBeInTheDocument()
  })

  it('na aba de recusados dá para aprovar de novo, e não tem Recusar', async () => {
    mockApi({
      'GET /clips/review?status=PENDING': none,
      'GET /clips/review?status=REJECTED': { status: 200, body: [clip({ status: 'REJECTED' })] },
    })
    renderRoutes(routes, '/moderacao/clipes?situacao=REJECTED')

    expect(await screen.findByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recusar' })).not.toBeInTheDocument()
  })

  it('tirar a ligação com a banda manda artistId nulo, e só então aparece "Salvar banda"', async () => {
    const fetchMock = mockApi({
      'GET /clips/review?status=PENDING': none,
      'GET /clips/review?status=APPROVED': {
        status: 200,
        body: [clip({ status: 'APPROVED', artist: { slug: 'fresno', name: 'Fresno' } })],
      },
      'PATCH /clips/c1': { status: 200, body: clip({ status: 'APPROVED' }) },
    })
    renderRoutes(routes, '/moderacao/clipes?situacao=APPROVED')

    fireEvent.click(await screen.findByRole('button', { name: 'Tirar a ligação com a banda' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar banda' }))

    await screen.findByText('Aprovado: Clipe da banda nova')
    expect(JSON.parse(patchOf(fetchMock)[1]?.body as string)).toEqual({ status: 'APPROVED', artistId: null })
  })

  it('mostra o erro da API na linha do clipe', async () => {
    mockApi({
      'GET /clips/review?status=PENDING': { status: 200, body: [clip()] },
      'PATCH /clips/c1': notFound,
    })
    renderRoutes(routes, '/moderacao/clipes')

    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Esse clipe não existe.')
    expect(within(alert.closest('li')!).getByText('Clipe da banda nova')).toBeInTheDocument()
  })

  it('sem sugestões, explica o que acontece; com falha, avisa', async () => {
    mockApi({ 'GET /clips/review?status=PENDING': none })
    const { unmount } = renderRoutes(routes, '/moderacao/clipes')
    expect(await screen.findByText(/Nenhuma sugestão esperando/)).toBeInTheDocument()
    unmount()

    mockApi({
      'GET /clips/review?status=PENDING': { status: 403, body: { statusCode: 403, code: 'forbidden', message: 'x' } },
    })
    renderRoutes(routes, '/moderacao/clipes')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os clipes.')
  })
})
