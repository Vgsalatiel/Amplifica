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
