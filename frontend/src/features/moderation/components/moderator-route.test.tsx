import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { renderRoutes, sessionFor, testUser } from '../../../test/helpers'
import { ModeratorRoute } from './moderator-route'

const routes = [{ element: <ModeratorRoute />, children: [{ path: '/moderacao', element: <p>Painel</p> }] }]

describe('ModeratorRoute', () => {
  it.each(['ADMIN', 'MODERATOR'] as const)('mostra o painel para %s', (role) => {
    startSession(sessionFor({ ...testUser, role }))
    renderRoutes(routes, '/moderacao')

    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('avisa a quem está logado mas não é da equipe', () => {
    startSession(sessionFor())
    renderRoutes(routes, '/moderacao')

    expect(screen.getByRole('heading', { name: 'Área restrita' })).toBeInTheDocument()
    expect(screen.queryByText('Painel')).not.toBeInTheDocument()
  })

  it('não mostra o painel a visitantes', () => {
    endSession()
    renderRoutes(routes, '/moderacao')

    expect(screen.queryByText('Painel')).not.toBeInTheDocument()
  })
})
