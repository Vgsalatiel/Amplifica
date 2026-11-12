import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { releaseSummary } from '../../test/fixtures'
import { renderWithProviders } from '../../test/helpers'
import { ReleaseCard } from './release-card'

describe('ReleaseCard', () => {
  it('mostra a nota quando o disco já foi avaliado', () => {
    renderWithProviders(<ReleaseCard release={releaseSummary({ rating: { average: 8.5, count: 12 } })} />)

    expect(screen.getByRole('img', { name: 'Nota 8,5 de 10' })).toBeInTheDocument()
    expect(screen.getByText('8,5')).toBeInTheDocument()
  })

  it('sem avaliações, não mostra nota nem medidor vazio', () => {
    renderWithProviders(<ReleaseCard release={releaseSummary()} />)

    expect(screen.queryByRole('img', { name: /Nota/ })).not.toBeInTheDocument()
  })

  it('liga ao disco e mostra artista e ano', () => {
    renderWithProviders(<ReleaseCard release={releaseSummary()} />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/lancamentos/bring-me-the-horizon-sempiternal')
    expect(screen.getByText('Bring Me the Horizon, 2013')).toBeInTheDocument()
  })
})
