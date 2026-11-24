import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ReleasesAdminPage } from './releases-admin-page'

const open = (path = '/admin/lancamentos') =>
  renderRoutes([{ path: '/admin/lancamentos', element: <ReleasesAdminPage /> }], path)

describe('ReleasesAdminPage', () => {
  it('lista os lançamentos, ligados à página de edição', async () => {
    mockApi({ 'GET /releases?page=1&limit=20': { status: 200, body: page([releaseSummary()]) } })
    open()

    const link = await screen.findByRole('link', { name: /Sempiternal/ })
    expect(link).toHaveAttribute('href', '/admin/lancamentos/bring-me-the-horizon-sempiternal')
    expect(screen.getByText('1 lançamento')).toBeInTheDocument()
  })

  it('busca pelo título ou pelo artista e guarda a busca na URL', async () => {
    const fetchMock = mockApi({
      'GET /releases?page=1&limit=20': { status: 200, body: page([releaseSummary()]) },
      'GET /releases?page=1&q=zzz&limit=20': { status: 200, body: page([]) },
    })
    const { router } = open()
    await screen.findByRole('link', { name: /Sempiternal/ })

    fireEvent.change(screen.getByLabelText('Buscar pelo título ou pelo artista'), { target: { value: ' zzz ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Nenhum lançamento encontrado para "zzz".')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=zzz')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a busca e o filtro de tipo funcionam juntos', async () => {
    mockApi({
      'GET /releases?page=1&q=bring&limit=20': { status: 200, body: page([releaseSummary()]) },
      'GET /releases?page=1&type=EP&q=bring&limit=20': { status: 200, body: page([]) },
    })
    const { router } = open('/admin/lancamentos?q=bring')
    await screen.findByRole('link', { name: /Sempiternal/ })
    expect(screen.getByLabelText('Buscar pelo título ou pelo artista')).toHaveValue('bring')

    fireEvent.change(screen.getByLabelText('Filtrar por tipo'), { target: { value: 'EP' } })

    expect(await screen.findByText('Nenhum lançamento encontrado para "bring" nesse tipo.')).toBeInTheDocument()
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('bring')
    expect(new URLSearchParams(router.state.location.search).get('type')).toBe('EP')
  })

  it('orienta quando ainda não há lançamentos', async () => {
    mockApi({ 'GET /releases?page=1&limit=20': { status: 200, body: page([]) } })
    open()

    expect(await screen.findByText(/Nenhum lançamento cadastrado ainda/)).toBeInTheDocument()
  })
})
