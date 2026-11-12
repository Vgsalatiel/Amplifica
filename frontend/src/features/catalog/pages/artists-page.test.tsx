import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { artistSummary, genreNode, page } from '../../../test/fixtures'
import { ArtistsPage } from './artists-page'

const tree = [genreNode('metal', 'Metal', [genreNode('metalcore', 'Metalcore', [], 'metal')]), genreNode('emo', 'Emo')]
const open = (search = '') => renderRoutes([{ path: '/artistas', element: <ArtistsPage /> }], `/artistas${search}`)

describe('ArtistsPage', () => {
  it('lista os artistas, aberta a qualquer visitante', async () => {
    endSession()
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /artists?page=1&limit=24': { status: 200, body: page([artistSummary()]) },
    })
    open()

    expect(await screen.findByRole('link', { name: /Bring Me the Horizon/ })).toHaveAttribute('href', '/artistas/bring-me-the-horizon')
    expect(screen.getByText('1 artista')).toBeInTheDocument()
    expect(document.title).toBe('Artistas | Amplifica')
  })

  it('filtra por gênero usando o endereço do gênero e guarda o filtro na URL', async () => {
    endSession()
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /artists?page=1&limit=24': { status: 200, body: page([artistSummary()]) },
      'GET /artists?page=1&genre=metal&limit=24': { status: 200, body: page([]) },
    })
    const { router } = open()
    await screen.findByRole('link', { name: /Bring Me the Horizon/ })

    fireEvent.change(screen.getByLabelText('Gênero'), { target: { value: 'metal' } })

    expect(await screen.findByText('Nenhum artista encontrado com esses filtros.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?genre=metal')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('genre=metal'))).toBe(true)
  })

  it('busca pelo nome', async () => {
    endSession()
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /artists?page=1&limit=24': { status: 200, body: page([]) },
      'GET /artists?page=1&q=bring&limit=24': { status: 200, body: page([artistSummary()]) },
    })
    const { router } = open()
    await screen.findByText('Nenhum artista cadastrado ainda.')

    fireEvent.change(screen.getByLabelText('Buscar pelo nome'), { target: { value: ' bring ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByRole('link', { name: /Bring Me the Horizon/ })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=bring')
  })

  it('abre já filtrada quando a URL traz o gênero', async () => {
    endSession()
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'GET /artists?page=1&genre=emo&limit=24': { status: 200, body: page([artistSummary({ id: 'x', name: 'Banda Emo', slug: 'banda-emo' })]) },
    })
    open('?genre=emo')

    expect(await screen.findByRole('link', { name: /Banda Emo/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Gênero')).toHaveValue('emo')
  })
})
