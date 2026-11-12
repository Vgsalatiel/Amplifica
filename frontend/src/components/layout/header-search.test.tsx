import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoutes } from '../../test/helpers'
import { HeaderSearch } from './header-search'

const routes = [
  { path: '/buscar', element: <HeaderSearch /> },
  { path: '/', element: <HeaderSearch /> },
]

const field = () => screen.getByRole('searchbox', { name: 'Buscar artistas e lançamentos' })

describe('HeaderSearch', () => {
  it('leva à página de busca com o texto na URL, sem espaços sobrando', () => {
    const { router } = renderRoutes(routes, '/')

    fireEvent.change(field(), { target: { value: '  sôfia ruído ' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(router.state.location.pathname).toBe('/buscar')
    expect(router.state.location.search).toBe('?q=s%C3%B4fia%20ru%C3%ADdo')
  })

  it('não busca com o campo vazio', () => {
    const { router } = renderRoutes(routes, '/')

    fireEvent.change(field(), { target: { value: '   ' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(router.state.location.pathname).toBe('/')
  })

  it('na página de busca, mostra o que está sendo procurado', () => {
    renderRoutes(routes, '/buscar?q=sempiternal')

    expect(field()).toHaveValue('sempiternal')
  })

  it('fora da página de busca, o campo começa vazio', () => {
    renderRoutes(routes, '/?q=sempiternal')

    expect(field()).toHaveValue('')
  })
})
