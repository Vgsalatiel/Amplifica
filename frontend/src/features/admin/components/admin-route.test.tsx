import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { AdminRoute } from './admin-route'

const routes = [{ element: <AdminRoute />, children: [{ path: '/admin', element: <p>Painel</p> }] }]

describe('AdminRoute', () => {
  it('mostra o painel para administradores', () => {
    startSession(sessionFor({ ...testUser, role: 'ADMIN' }))
    renderRoutes(routes, '/admin')

    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('avisa a quem está logado mas não é administrador', () => {
    startSession(sessionFor())
    renderRoutes(routes, '/admin')

    expect(screen.getByRole('heading', { name: 'Área restrita' })).toBeInTheDocument()
    expect(screen.queryByText('Painel')).not.toBeInTheDocument()
  })

  it('não mostra o painel a visitantes', () => {
    endSession()
    renderRoutes(routes, '/admin')

    expect(screen.queryByText('Painel')).not.toBeInTheDocument()
  })
})
