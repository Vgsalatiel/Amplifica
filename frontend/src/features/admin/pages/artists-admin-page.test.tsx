import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ArtistSummary, Paginated } from '../../../types/api'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ArtistsAdminPage } from './artists-admin-page'

const artist: ArtistSummary = {
  id: 'a1',
  name: 'Vidro Fosco',
  slug: 'vidro-fosco',
  type: 'BAND',
  country: 'BR',
  image: null,
  genres: [{ id: 'g1', name: 'Emo', slug: 'emo' }],
}
const page = (items: ArtistSummary[], total = items.length): Paginated<ArtistSummary> => ({
  items,
  meta: { page: 1, limit: 20, total, totalPages: 1 },
})

describe('ArtistsAdminPage', () => {
  it('lista os artistas com tipo, país e gêneros, ligados à página de edição', async () => {
    mockApi({ 'GET /artists?page=1&limit=20': { status: 200, body: page([artist]) } })
    renderRoutes([{ path: '/admin/artistas', element: <ArtistsAdminPage /> }], '/admin/artistas')

    const link = await screen.findByRole('link', { name: /Vidro Fosco/ })
    expect(link).toHaveAttribute('href', '/admin/artistas/vidro-fosco')
    expect(link).toHaveTextContent('Banda, BR, Emo')
    expect(screen.getByText('1 artista')).toBeInTheDocument()
  })

  it('busca pelo nome e guarda a busca na URL', async () => {
    const fetchMock = mockApi({
      'GET /artists?page=1&limit=20': { status: 200, body: page([artist]) },
      'GET /artists?page=1&q=zzz&limit=20': { status: 200, body: page([]) },
    })
    const { router } = renderRoutes([{ path: '/admin/artistas', element: <ArtistsAdminPage /> }], '/admin/artistas')
    await screen.findByText('Vidro Fosco', { exact: false })

    fireEvent.change(screen.getByLabelText('Buscar pelo nome'), { target: { value: ' zzz ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Nenhum artista com "zzz" no nome.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=zzz')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('orienta quando ainda não há artistas', async () => {
    mockApi({ 'GET /artists?page=1&limit=20': { status: 200, body: page([]) } })
    renderRoutes([{ path: '/admin/artistas', element: <ArtistsAdminPage /> }], '/admin/artistas')

    expect(await screen.findByText(/Nenhum artista cadastrado ainda/)).toBeInTheDocument()
  })
})
