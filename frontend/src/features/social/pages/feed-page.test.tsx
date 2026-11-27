import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor } from '../../../test/helpers'
import type { FeedItem } from '../api/social-api'
import { FeedPage } from './feed-page'

const user = { username: 'bia', displayName: 'Bia', avatar: null }
const at = new Date(Date.now() - 2 * 3_600_000).toISOString()
const review: FeedItem = {
  id: 'review:1',
  type: 'review',
  at,
  user,
  rating: 9,
  excerpt: 'Disco muito bom.',
  release: { slug: 'sempiternal', title: 'Sempiternal', cover: null, artists: ['Bring Me the Horizon'] },
}
const favorite: FeedItem = { id: 'favorite:1', type: 'favorite', at, user, artist: { slug: 'fresno', name: 'Fresno', image: null } }
const clip: FeedItem = { id: 'clip:1', type: 'clip', at, user, clip: { youtubeId: 'dQw4w9WgXcQ', title: 'Clipe novo', artist: { slug: 'pitty', name: 'Pitty' } } }
const show: FeedItem = {
  id: 'attendance:1',
  type: 'attendance',
  at,
  user,
  show: { slug: 'show-x', title: 'Motionless In White', date: '2027-03-05', city: 'São Paulo', state: 'SP' },
}

describe('FeedPage', () => {
  it('mostra cada tipo de atividade com os links certos', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({ 'GET /feed?limit=20': { status: 200, body: { items: [review, favorite, clip, show], next: null, following: 1 } } })
    renderWithProviders(<FeedPage />)

    const items = await screen.findAllByRole('article')
    expect(items).toHaveLength(4)
    expect(within(items[0]!).getByRole('link', { name: 'Sempiternal' })).toHaveAttribute('href', '/lancamentos/sempiternal')
    expect(items[0]).toHaveTextContent('Bia avaliou um disco')
    expect(items[0]).toHaveTextContent('Bring Me the Horizon')
    expect(within(items[0]!).getByText(/Nota/)).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('9/10')
    expect(items[0]).toHaveTextContent('“Disco muito bom.”')
    expect(within(items[0]!).getByRole('link', { name: 'Bia' })).toHaveAttribute('href', '/u/bia')
    expect(items[1]).toHaveTextContent('Bia marcou uma banda favorita')
    expect(within(items[1]!).getByRole('link', { name: 'Fresno' })).toHaveAttribute('href', '/artistas/fresno')
    expect(items[2]).toHaveTextContent('Bia descobriu um clipe')
    expect(items[2]).toHaveTextContent('Clipe novo')
    expect(within(items[2]!).getByRole('link', { name: 'Pitty' })).toHaveAttribute('href', '/artistas/pitty')
    expect(items[3]).toHaveTextContent('Bia vai a um show')
    expect(within(items[3]!).getByRole('link', { name: 'Motionless In White' })).toHaveAttribute('href', '/shows/show-x')
    expect(items[3]).toHaveTextContent('São Paulo/SP, 5 de março')
    expect(within(items[0]!).getByText('há 2 h')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeInTheDocument()
  })

  it('sem seguir ninguém, explica como começar', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({ 'GET /feed?limit=20': { status: 200, body: { items: [], next: null, following: 0 } } })
    renderWithProviders(<FeedPage />)

    expect(await screen.findByRole('heading', { name: 'Seu feed está vazio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Procurar pessoas' })).toHaveAttribute('href', '/pessoas')
  })

  it('seguindo gente que ainda não fez nada, diz isso', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({ 'GET /feed?limit=20': { status: 200, body: { items: [], next: null, following: 3 } } })
    renderWithProviders(<FeedPage />)

    expect(await screen.findByText(/ainda não fizeram nada por aqui/)).toBeInTheDocument()
  })

  it('"Ver mais" pede a próxima página pela data e acrescenta as atividades', async () => {
    endSession()
    startSession(sessionFor())
    const next = '2026-01-02T10:00:00.000Z'
    const fetchMock = mockApi({
      'GET /feed?limit=20': { status: 200, body: { items: [review], next, following: 1 } },
      [`GET /feed?limit=20&before=${encodeURIComponent(next)}`]: { status: 200, body: { items: [favorite], next: null, following: 1 } },
    })
    renderWithProviders(<FeedPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ver mais' }))

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('avisa quando não consegue carregar e deixa tentar de novo', async () => {
    endSession()
    startSession(sessionFor())
    mockApi({ 'GET /feed?limit=20': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'x' } } })
    renderWithProviders(<FeedPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o feed')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
