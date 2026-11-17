import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { show } from '../../test/fixtures'
import { ShowRow } from './show-row'

describe('ShowRow', () => {
  it('mostra a data, a banda, o local e o link do vendedor em outra aba', () => {
    renderWithProviders(<ShowRow show={show()} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByText('Allianz Parque, São Paulo/SP')).toBeInTheDocument()
    const time = screen.getByText('15 de março de 2027').closest('time')
    expect(time).toHaveAttribute('datetime', '2027-03-15')
    expect(within(time!).getByText('seg, mar')).toBeInTheDocument()

    const link = screen.getByRole('link', {
      name: 'Ingressos de Linkin Park, no site do vendedor (abre em outra aba)',
    })
    expect(link).toHaveAttribute('href', 'https://ingressos.exemplo.test/lp')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('mostra quando a informação foi conferida', () => {
    renderWithProviders(<ShowRow show={show({ verifiedAt: '2026-11-13T15:30:00.000Z' })} />)

    expect(screen.getByText('Conferido em 13/11/2026')).toBeInTheDocument()
  })

  it('com nome de evento, o nome é o título e as bandas vêm abaixo, as do catálogo como link', () => {
    renderWithProviders(
      <ShowRow
        show={show({
          name: 'Bangers Open Air 2027',
          acts: [
            { position: 0, name: 'Slipknot', artist: { id: 'a1', name: 'Slipknot', slug: 'slipknot', image: null } },
            { position: 1, name: 'Banda de Fora', artist: null },
          ],
        })}
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Bangers Open Air 2027' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Slipknot' })).toHaveAttribute('href', '/artistas/slipknot')
    expect(screen.getByText(/Banda de Fora/)).toBeInTheDocument()
  })

  it('show de uma banda com nome de turnê: a banda é o título e a turnê vem abaixo', () => {
    renderWithProviders(<ShowRow show={show({ name: 'Fifty Something Tour' })} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Linkin Park' })).toBeInTheDocument()
    expect(screen.getByText('Fifty Something Tour')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ingressos de Linkin Park/ })).toBeInTheDocument()
  })

  it('avisa quando o show está esgotado', () => {
    renderWithProviders(<ShowRow show={show({ status: 'SOLD_OUT' })} />)

    expect(screen.getByText('Esgotado')).toBeInTheDocument()
  })

  it('não mostra o aviso de situação para show confirmado', () => {
    renderWithProviders(<ShowRow show={show()} />)

    expect(screen.queryByText('Confirmado')).not.toBeInTheDocument()
  })

  it('sem link do vendedor, não mostra o botão de ingressos', () => {
    renderWithProviders(<ShowRow show={show({ ticketUrl: null })} />)

    expect(screen.queryByRole('link', { name: /Ingressos/ })).not.toBeInTheDocument()
  })

  it('não transforma em link um endereço que não seja http(s)', () => {
    renderWithProviders(<ShowRow show={show({ ticketUrl: 'javascript:alert(1)' })} />)

    expect(screen.queryByRole('link', { name: /Ingressos/ })).not.toBeInTheDocument()
  })

  it('mostra o organizador com link e o pôster que abre em outra aba', () => {
    renderWithProviders(
      <ShowRow
        show={show({
          organizerName: 'Emo Tour',
          organizerUrl: 'https://www.instagram.com/emotourbrasil/',
          poster: { large: 'https://files.test/posters/x-lg.webp', small: 'https://files.test/posters/x-sm.webp' },
        })}
      />,
    )

    const organizer = screen.getByRole('link', { name: /Emo Tour/ })
    expect(organizer).toHaveAttribute('href', 'https://www.instagram.com/emotourbrasil/')
    expect(organizer).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('img', { name: 'Pôster de Linkin Park' })).toHaveAttribute(
      'src',
      'https://files.test/posters/x-sm.webp',
    )
    expect(screen.getByRole('img', { name: 'Pôster de Linkin Park' }).closest('a')).toHaveAttribute(
      'href',
      'https://files.test/posters/x-lg.webp',
    )
  })

  it('organizador com link inseguro aparece só como texto', () => {
    renderWithProviders(<ShowRow show={show({ organizerName: 'Emo Tour', organizerUrl: 'javascript:alert(1)' })} />)

    expect(screen.getByText(/Emo Tour/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Emo Tour/ })).not.toBeInTheDocument()
  })
})
