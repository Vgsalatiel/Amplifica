import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { artistSummary } from '../../../test/fixtures'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import { UserFavorites } from './user-favorites'

describe('UserFavorites', () => {
  it('mostra as bandas favoritas, ligadas à página de cada uma', async () => {
    mockApi({
      'GET /users/marina.fz/favorites': {
        status: 200,
        body: [artistSummary({ id: 'a1', name: 'Fresno', slug: 'fresno' }), artistSummary({ id: 'a2', name: 'Pitty', slug: 'pitty' })],
      },
    })
    renderWithProviders(<UserFavorites username="marina.fz" displayName="Marina" isOwnProfile={false} />)

    const list = await screen.findByRole('list')
    expect(within(list).getByRole('link', { name: /Fresno/ })).toHaveAttribute('href', '/artistas/fresno')
    expect(within(list).getByRole('link', { name: /Pitty/ })).toHaveAttribute('href', '/artistas/pitty')
  })

  it('sem favoritas, o dono do perfil recebe a dica e os outros veem um aviso curto', async () => {
    mockApi({ 'GET /users/marina.fz/favorites': { status: 200, body: [] } })
    const { unmount } = renderWithProviders(<UserFavorites username="marina.fz" displayName="Marina" isOwnProfile />)
    expect(await screen.findByText(/Toque na estrela na página de uma banda/)).toBeInTheDocument()
    unmount()

    mockApi({ 'GET /users/marina.fz/favorites': { status: 200, body: [] } })
    renderWithProviders(<UserFavorites username="marina.fz" displayName="Marina" isOwnProfile={false} />)
    expect(await screen.findByText('Marina ainda não marcou bandas favoritas.')).toBeInTheDocument()
  })

  it('avisa quando não consegue carregar', async () => {
    mockApi({ 'GET /users/marina.fz/favorites': { status: 404, body: { statusCode: 404, code: 'user_not_found', message: 'x' } } })
    renderWithProviders(<UserFavorites username="marina.fz" displayName="Marina" isOwnProfile={false} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as bandas favoritas')
  })
})
