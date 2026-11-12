import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { renderRoutes, sessionFor } from '../../../test/helpers'
import { RatingPrompt } from './rating-prompt'

const routes = [
  { path: '/lancamentos/sempiternal', element: <RatingPrompt /> },
  { path: '/cadastro', element: <p>Tela de cadastro</p> },
  { path: '/entrar', element: <p>Tela de login</p> },
]

describe('RatingPrompt', () => {
  it('convida o visitante a criar conta e lembra de qual disco ele veio', () => {
    endSession()
    const { router } = renderRoutes(routes, '/lancamentos/sempiternal')

    expect(screen.getByText(/Para ver discos, bandas e gêneros, você não precisa de conta/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))

    expect(screen.getByText('Tela de cadastro')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/lancamentos/sempiternal' })
  })

  it('o botão de entrar também volta ao disco', () => {
    endSession()
    const { router } = renderRoutes(routes, '/lancamentos/sempiternal')

    fireEvent.click(screen.getByRole('link', { name: 'Entrar' }))

    expect(router.state.location.pathname).toBe('/entrar')
    expect(router.state.location.state).toEqual({ from: '/lancamentos/sempiternal' })
  })

  it('a quem já tem conta, avisa que a avaliação está chegando', () => {
    startSession(sessionFor())
    renderRoutes(routes, '/lancamentos/sempiternal')

    expect(screen.getByText(/As avaliações estão chegando/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
  })

  it('não mostra nada enquanto a sessão é verificada', () => {
    const { container } = renderRoutes(routes, '/lancamentos/sempiternal')

    expect(container).toBeEmptyDOMElement()
  })
})
