import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RatingSummaryBlock } from './rating-summary'

describe('RatingSummaryBlock', () => {
  it('mostra a média com vírgula, o medidor e o número de avaliações', () => {
    render(<RatingSummaryBlock rating={{ average: 8.5, count: 12 }} />)

    expect(screen.getByText(/8,5/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nota 8,5 de 10' })).toBeInTheDocument()
    expect(screen.getByText('12 avaliações')).toBeInTheDocument()
  })

  it('usa o singular com uma só avaliação', () => {
    render(<RatingSummaryBlock rating={{ average: 7, count: 1 }} />)

    expect(screen.getByText('1 avaliação')).toBeInTheDocument()
  })

  it('sem avaliações, convida a ser a primeira pessoa e não mostra média', () => {
    render(<RatingSummaryBlock rating={{ average: null, count: 0 }} />)

    expect(screen.getByText(/Seja a primeira pessoa/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
