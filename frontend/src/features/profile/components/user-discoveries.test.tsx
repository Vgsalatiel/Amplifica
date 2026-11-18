import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import type { PlaylistClip } from '../../../types/api'
import { UserDiscoveries } from './user-discoveries'

const clip = (overrides: Partial<PlaylistClip> = {}): PlaylistClip => ({
  id: 'c1',
  youtubeId: 'dQw4w9WgXcQ',
  title: 'Clipe da banda nova',
  channelName: 'Canal da Banda',
  pinned: false,
  artist: { slug: 'banda-nova', name: 'Banda Nova' },
  suggestedBy: { username: 'ana', displayName: 'Ana' },
  createdAt: '2026-11-17T12:00:00.000Z',
  ...overrides,
})
const URL = 'GET /users/ana/discoveries'

describe('UserDiscoveries', () => {
  it('mostra o selo, o total, o que falta e os clipes com link para o YouTube e para a banda', async () => {
    mockApi({ [URL]: { status: 200, body: { count: 2, items: [clip()] } } })
    renderWithProviders(<UserDiscoveries username="ana" isOwnProfile={false} />)

    expect(await screen.findByText('Descobridor')).toBeInTheDocument()
    expect(screen.getByText(/2 clipes aprovados · faltam 3 para Garimpeiro/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Clipe da banda nova/ })
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Banda Nova' })).toHaveAttribute('href', '/artistas/banda-nova')
  })

  it('sem clipes: dono do perfil recebe o convite; visitante, só o aviso', async () => {
    mockApi({ [URL]: { status: 200, body: { count: 0, items: [] } } })
    const own = renderWithProviders(<UserDiscoveries username="ana" isOwnProfile />)
    expect(await screen.findByText(/Sugira um clipe na página inicial/)).toBeInTheDocument()
    expect(screen.queryByText('Descobridor')).not.toBeInTheDocument()
    own.unmount()

    renderWithProviders(<UserDiscoveries username="ana" isOwnProfile={false} />)
    expect(await screen.findByText('Nenhum clipe descoberto ainda.')).toBeInTheDocument()
  })

  it('cinco clipes viram Garimpeiro e não mostram próximo nível', async () => {
    mockApi({ [URL]: { status: 200, body: { count: 5, items: [clip()] } } })
    renderWithProviders(<UserDiscoveries username="ana" isOwnProfile={false} />)

    expect(await screen.findByText('Garimpeiro')).toBeInTheDocument()
    expect(screen.queryByText(/faltam/)).not.toBeInTheDocument()
  })
})
