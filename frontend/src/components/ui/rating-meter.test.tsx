import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { formatRating } from '../../lib/format-rating'
import { RatingMeter } from './rating-meter'

function litLevels(container: HTMLElement): number {
  return container.querySelectorAll('[data-lit="true"]').length
}

describe('RatingMeter', () => {
  it('acende um nível por ponto da nota', () => {
    const { container } = render(<RatingMeter value={7} />)

    expect(litLevels(container)).toBe(7)
    expect(container.querySelectorAll('[data-lit]')).toHaveLength(10)
  })

  it('arredonda médias e informa a nota exata no rótulo', () => {
    const { container } = render(<RatingMeter value={8.4} />)

    expect(litLevels(container)).toBe(8)
    expect(screen.getByRole('img', { name: 'Nota 8,4 de 10' })).toBeInTheDocument()
  })

  it('limita valores fora da escala', () => {
    const { container, rerender } = render(<RatingMeter value={14} />)
    expect(litLevels(container)).toBe(10)

    rerender(<RatingMeter value={-3} />)
    expect(litLevels(container)).toBe(0)
  })
})

describe('formatRating', () => {
  it('usa vírgula decimal e no máximo uma casa', () => {
    expect(formatRating(8.44)).toBe('8,4')
    expect(formatRating(9)).toBe('9')
  })
})
