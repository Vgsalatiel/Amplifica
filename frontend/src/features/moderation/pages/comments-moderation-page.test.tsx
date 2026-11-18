import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoutes } from '../../../test/helpers'
import type { ReportedComment } from '../../../types/api'
import { CommentsModerationPage } from './comments-moderation-page'

const reported = (overrides: Partial<ReportedComment> = {}): ReportedComment => ({
  id: 'k1',
  body: 'Comentário polêmico',
  createdAt: '2026-11-18T12:00:00.000Z',
  author: { username: 'ana', displayName: 'Ana', avatar: null },
  show: { slug: 'show-1', name: null, acts: ['Fresno'] },
  reportCount: 2,
  reasons: ['Ofensivo'],
  ...overrides,
})
const routes = [{ path: '/moderacao/denuncias', element: <CommentsModerationPage /> }]

describe('CommentsModerationPage', () => {
  it('lista o comentário com o total de denúncias, os motivos e o link do show', async () => {
    mockApi({ 'GET /comments/reported': { status: 200, body: [reported()] } })
    renderRoutes(routes, '/moderacao/denuncias')

    expect(await screen.findByText('Comentário polêmico')).toBeInTheDocument()
    expect(screen.getByText('2 denúncias')).toBeInTheDocument()
    expect(screen.getByText('Ofensivo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fresno' })).toHaveAttribute('href', '/shows/show-1')
    expect(screen.getByRole('link', { name: '@ana' })).toHaveAttribute('href', '/u/ana')
  })

  it('fila vazia explica o que aparece ali', async () => {
    mockApi({ 'GET /comments/reported': { status: 200, body: [] } })
    renderRoutes(routes, '/moderacao/denuncias')

    expect(await screen.findByText(/Nenhuma denúncia esperando/)).toBeInTheDocument()
  })

  it('"Manter comentário" tira o item da fila sem apagar', async () => {
    const fetchMock = mockApi({
      'GET /comments/reported': [
        { status: 200, body: [reported()] },
        { status: 200, body: [] },
      ],
      'DELETE /comments/k1/reports': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/denuncias')

    fireEvent.click(await screen.findByRole('button', { name: 'Manter comentário' }))

    expect(await screen.findByText(/Nenhuma denúncia esperando/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/comments/k1'))).toBe(false)
  })

  it('apaga o comentário depois de confirmar', async () => {
    const fetchMock = mockApi({
      'GET /comments/reported': [
        { status: 200, body: [reported()] },
        { status: 200, body: [] },
      ],
      'DELETE /comments/k1': { status: 204 },
    })
    renderRoutes(routes, '/moderacao/denuncias')

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByText(/Nenhuma denúncia esperando/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/comments/k1') && init?.method === 'DELETE')).toBe(true)
  })
})
