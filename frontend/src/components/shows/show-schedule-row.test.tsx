import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { show } from '../../test/fixtures'
import { ShowScheduleRow } from './show-schedule-row'

describe('ShowScheduleRow', () => {
  it('mostra o dia, a hora em destaque, o local e o link do vendedor em outra aba', () => {
    renderWithProviders(<ShowScheduleRow show={show({ startTime: '14:00' })} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByText('15 de março de 2027').closest('time')).toHaveAttribute('datetime', '2027-03-15')
    expect(screen.getAllByText(/14h/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Allianz Parque, São Paulo\/SP/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Ingressos de Linkin Park/ })
    expect(link).toHaveAttribute('href', 'https://ingressos.exemplo.test/lp')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('evento com nome usa o nome como título e mostra o organizador', () => {
    renderWithProviders(<ShowScheduleRow show={show({ name: 'CENABR Festival 2027', organizerName: 'Emo Tour' })} />)

    expect(screen.getByRole('heading', { level: 3, name: 'CENABR Festival 2027' })).toBeInTheDocument()
    expect(screen.getByText(/Organização: Emo Tour/)).toBeInTheDocument()
  })

  it('sem horário e sem link seguro, não inventa hora nem botão', () => {
    renderWithProviders(<ShowScheduleRow show={show({ startTime: null, ticketUrl: 'javascript:alert(1)' })} />)

    expect(screen.queryByText(/\dh/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ingressos/ })).not.toBeInTheDocument()
  })
})
