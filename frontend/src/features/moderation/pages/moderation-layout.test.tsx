import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoutes } from '../../../test/helpers'
import { ModerationLayout } from './moderation-layout'

describe('ModerationLayout', () => {
  it('mostra o título, a seção de clipes e o conteúdo da rota', () => {
    renderRoutes(
      [{ path: '/moderacao', element: <ModerationLayout />, children: [{ path: 'clipes', element: <p>Fila</p> }] }],
      '/moderacao/clipes',
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Moderação' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clipes' })).toHaveAttribute('href', '/moderacao/clipes')
    expect(screen.getByText('Fila')).toBeInTheDocument()
  })
})
