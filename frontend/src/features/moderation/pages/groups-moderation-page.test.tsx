import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoutes } from '../../../test/helpers'
import type { ReviewGroup } from '../../../types/api'
import { GroupsModerationPage } from './groups-moderation-page'

const row = (overrides: Partial<ReviewGroup> = {}): ReviewGroup => ({
  id: 'g1',
  platform: 'TELEGRAM',
  url: 'https://t.me/emoshow',
  status: 'PENDING',
  createdAt: '2026-11-18T12:00:00.000Z',
  reviewedAt: null,
  show: { slug: 'show-1', name: null, acts: ['Fresno'] },
  suggestedBy: { username: 'ana' },
  ...overrides,
})
const routes = [{ path: '/moderacao/grupos', element: <GroupsModerationPage /> }]

describe('GroupsModerationPage', () => {
  it('abre nos pendentes com o link para conferir o convite e o show', async () => {
    mockApi({ 'GET /groups/review?status=PENDING': { status: 200, body: [row()] } })
    renderRoutes(routes, '/moderacao/grupos')

    const link = await screen.findByRole('link', { name: /Abrir o convite/ })
    expect(link).toHaveAttribute('href', 'https://t.me/emoshow')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.getByRole('link', { name: 'Fresno' })).toHaveAttribute('href', '/shows/show-1')
    expect(screen.getByText(/sugerido por @ana/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pendentes (1)' })).toHaveAttribute('aria-current', 'page')
  })

  it('fila vazia explica o que aparece ali', async () => {
    mockApi({ 'GET /groups/review?status=PENDING': { status: 200, body: [] } })
    renderRoutes(routes, '/moderacao/grupos')

    expect(await screen.findByText(/Nenhum grupo esperando/)).toBeInTheDocument()
  })

  it('aprova e o item sai da fila', async () => {
    const fetchMock = mockApi({
      'GET /groups/review?status=PENDING': [
        { status: 200, body: [row()] },
        { status: 200, body: [] },
      ],
      'PATCH /groups/g1': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/grupos')

    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))

    expect(await screen.findByText(/Nenhum grupo esperando/)).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
    expect(JSON.parse(String(patch[1]?.body))).toEqual({ status: 'APPROVED' })
  })

  it('recusa o grupo', async () => {
    const fetchMock = mockApi({
      'GET /groups/review?status=PENDING': [
        { status: 200, body: [row()] },
        { status: 200, body: [] },
      ],
      'PATCH /groups/g1': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/grupos')

    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))

    expect(await screen.findByText(/Nenhum grupo esperando/)).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
    expect(JSON.parse(String(patch[1]?.body))).toEqual({ status: 'REJECTED' })
  })

  it('remove o grupo depois de confirmar', async () => {
    const fetchMock = mockApi({
      'GET /groups/review?status=PENDING': [
        { status: 200, body: [row()] },
        { status: 200, body: [] },
      ],
      'DELETE /groups/g1': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/grupos')

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByText(/Nenhum grupo esperando/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
  })
})
