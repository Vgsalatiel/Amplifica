import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { renderRoutes, sessionFor } from '../../../test/helpers'
import { ProtectedRoute } from './protected-route'

const routes = [
  { element: <ProtectedRoute />, children: [{ path: '/conta', element: <p>Área protegida</p> }] },
  { path: '/entrar', element: <p>Tela de login</p> },
]

describe('ProtectedRoute', () => {
  it('manda o visitante para o login, lembrando de onde ele veio', () => {
    endSession()
    const { router } = renderRoutes(routes, '/conta')

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/conta' })
  })

  it('mostra o conteúdo para quem está logado', () => {
    startSession(sessionFor())
    renderRoutes(routes, '/conta')

    expect(screen.getByText('Área protegida')).toBeInTheDocument()
  })

  it('espera a verificação da sessão antes de decidir', () => {
    renderRoutes(routes, '/conta')

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument()
  })
})
