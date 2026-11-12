import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Cover } from './cover'

describe('Cover', () => {
  it('usa a versão pequena em listas e a grande na página', () => {
    const image = { large: '/g.webp', small: '/p.webp' }
    const { rerender } = render(<Cover title="Sempiternal" image={image} />)
    expect(screen.getByRole('img', { name: 'Capa de Sempiternal' })).toHaveAttribute('src', '/p.webp')

    rerender(<Cover title="Sempiternal" image={image} size="large" />)
    expect(screen.getByRole('img', { name: 'Capa de Sempiternal' })).toHaveAttribute('src', '/g.webp')
  })

  it('sem capa, mostra o título em um quadro e diz isso a leitores de tela', () => {
    render(<Cover title="Count Your Blessings" image={null} />)

    expect(screen.getByRole('img', { name: 'Count Your Blessings (sem capa)' })).toBeInTheDocument()
  })
})
