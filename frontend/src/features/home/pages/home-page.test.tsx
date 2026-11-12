import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { genreNode, page, releaseSummary } from '../../../test/fixtures'
import { HomePage } from './home-page'

const open = () => renderRoutes([{ path: '/', element: <HomePage /> }], '/')

describe('HomePage', () => {
  it('mostra lançamentos recentes e gêneros', async () => {
    endSession()
    mockApi({
      'GET /releases?limit=8': { status: 200, body: page([releaseSummary()]) },
      'GET /genres': { status: 200, body: [genreNode('emo', 'Emo')] },
    })
    open()

    expect(await screen.findByRole('link', { name: /Sempiternal/ })).toHaveAttribute('href', '/lancamentos/bring-me-the-horizon-sempiternal')
    expect(screen.getByRole('link', { name: 'Emo' })).toHaveAttribute('href', '/generos/emo')
    expect(screen.getByRole('link', { name: 'Ver os artistas' })).toBeInTheDocument()
  })

  it('o visitante vê o convite para criar conta; quem já tem conta, não', async () => {
    endSession()
    mockApi({ 'GET /releases?limit=8': { status: 200, body: page([]) }, 'GET /genres': { status: 200, body: [] } })
    const { unmount } = open()
    expect(await screen.findByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    unmount()

    startSession(sessionFor())
    mockApi({ 'GET /releases?limit=8': { status: 200, body: page([]) }, 'GET /genres': { status: 200, body: [] } })
    open()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
  })

  it('funciona com o catálogo vazio, sem seções vazias', async () => {
    endSession()
    mockApi({ 'GET /releases?limit=8': { status: 200, body: page([]) }, 'GET /genres': { status: 200, body: [] } })
    open()

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Lançamentos recentes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Explore por gênero' })).not.toBeInTheDocument()
  })
})
