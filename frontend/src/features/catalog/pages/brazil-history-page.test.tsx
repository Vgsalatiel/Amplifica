import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { artistSummary, page } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { BrazilHistoryPage } from './brazil-history-page'

const open = () => renderRoutes([{ path: '/cena-br/historia', element: <BrazilHistoryPage /> }], '/cena-br/historia')

describe('BrazilHistoryPage', () => {
  it('conta a história em capítulos e cita as fontes', async () => {
    endSession()
    mockApi({ 'GET /artists?country=BR&limit=50': { status: 200, body: page([]) } })
    open()

    expect(screen.getByRole('heading', { level: 1, name: 'História da cena BR' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'O hardcore toma conta do punk' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'A cena hoje' })).toBeInTheDocument()
    const sources = screen.getByRole('region', { name: 'Fontes' })
    expect(within(sources).getByRole('link', { name: 'Wikipédia: Emo' })).toHaveAttribute(
      'href',
      'https://pt.wikipedia.org/wiki/Emo',
    )
    expect(document.title).toBe('História da cena BR | Amplifica')
  })

  it('tem a seção da MTV Brasil com a linha do tempo, sem ligar o Amplifica à emissora', () => {
    endSession()
    mockApi({ 'GET /artists?country=BR&limit=50': { status: 200, body: page([]) } })
    open()

    const mtv = screen.getByRole('region', { name: 'A MTV Brasil e a cena' })
    expect(within(mtv).getByText(/20 de outubro de 1990/)).toBeInTheDocument()
    const items = within(within(mtv).getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.querySelector('strong')?.textContent)).toEqual([
      '1990',
      '1995',
      '2007',
      '2013',
      '2025',
    ])
    expect(within(mtv).getByText('O Amplifica não tem ligação com a MTV.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Wikipédia: MTV Brasil' })).toHaveAttribute(
      'href',
      'https://pt.wikipedia.org/wiki/MTV_Brasil',
    )
  })

  it('só liga ao catálogo as bandas que estão cadastradas', async () => {
    endSession()
    mockApi({
      'GET /artists?country=BR&limit=50': {
        status: 200,
        body: page([artistSummary({ id: 'f', name: 'Fresno', slug: 'fresno' })]),
      },
    })
    open()

    expect(await screen.findByRole('link', { name: 'Fresno' })).toHaveAttribute('href', '/artistas/fresno')
    expect(screen.queryByRole('link', { name: 'Gloria' })).not.toBeInTheDocument()
    expect(screen.getByText('Gloria')).toBeInTheDocument()
  })

  it('tem o submenu com as duas abas da Cena BR', () => {
    endSession()
    mockApi({ 'GET /artists?country=BR&limit=50': { status: 200, body: page([]) } })
    open()

    const tabs = screen.getByRole('navigation', { name: 'Cena BR' })
    expect(within(tabs).getByRole('link', { name: 'Bandas' })).toHaveAttribute('href', '/cena-br')
    expect(within(tabs).getByRole('link', { name: 'História da cena' })).toHaveAttribute('aria-current', 'page')
  })
})
