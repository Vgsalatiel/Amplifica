import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { artistSummary, page } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { BrazilScenePage } from './brazil-scene-page'

const open = () => renderRoutes([{ path: '/cena-br', element: <BrazilScenePage /> }], '/cena-br')

describe('BrazilScenePage', () => {
  it('mostra as bandas novas e todas as brasileiras, sem exigir login', async () => {
    endSession()
    const fetchMock = mockApi({
      'GET /artists?country=BR&formedFrom=2018&sort=newest&limit=8': {
        status: 200,
        body: page([artistSummary({ id: 'a1', name: 'Banda Nova', slug: 'banda-nova' })]),
      },
      'GET /artists?country=BR&page=1&limit=24': {
        status: 200,
        body: page([artistSummary({ id: 'a2', name: 'Banda Antiga', slug: 'banda-antiga' })]),
      },
    })
    open()

    expect(await screen.findByRole('link', { name: /Banda Nova/ })).toHaveAttribute('href', '/artistas/banda-nova')
    expect(await screen.findByRole('link', { name: /Banda Antiga/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cena BR' })).toBeInTheDocument()
    expect(screen.getByText('Formadas de 2018 em diante.')).toBeInTheDocument()
    expect(screen.getByText('1 banda')).toBeInTheDocument()
    expect(document.title).toBe('Cena BR | Amplifica')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('esconde a seção de novas quando não há nenhuma', async () => {
    endSession()
    mockApi({
      'GET /artists?country=BR&formedFrom=2018&sort=newest&limit=8': { status: 200, body: page([]) },
      'GET /artists?country=BR&page=1&limit=24': { status: 200, body: page([]) },
    })
    open()

    expect(await screen.findByText('Nenhuma banda brasileira cadastrada ainda.')).toBeInTheDocument()
    expect(screen.queryByText('Bandas novas')).not.toBeInTheDocument()
  })
})
