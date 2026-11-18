import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderWithProviders, sessionFor } from '../../../test/helpers'
import type { TasteMatch } from '../../../types/api'
import { TasteMatchSection } from './taste-match'

const URL = 'GET /users/bia/compatibility'
const match = (overrides: Partial<TasteMatch> = {}): TasteMatch => ({
  score: 70,
  sharedCount: 3,
  myRatedCount: 3,
  theirRatedCount: 5,
  bothLike: [{ artist: { slug: 'fresno', name: 'Fresno', image: null }, mine: 9, theirs: 8.5 }],
  recommended: [{ artist: { slug: 'dead-fish', name: 'Dead Fish', image: null }, theirs: 10 }],
  ...overrides,
})
const open = () => renderWithProviders(<TasteMatchSection username="bia" displayName="Bia" />)

describe('TasteMatchSection', () => {
  it('visitante é convidado a entrar, sem chamar a API', () => {
    endSession()
    const fetchMock = mockApi({})
    open()

    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute('href', '/entrar')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mostra a porcentagem, as bandas que os dois curtem e as indicações', async () => {
    startSession(sessionFor())
    mockApi({ [URL]: { status: 200, body: match() } })
    open()

    expect(await screen.findByText('70%')).toBeInTheDocument()
    expect(screen.getByText(/3 bandas que vocês dois avaliaram/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fresno/ })).toHaveAttribute('href', '/artistas/fresno')
    expect(screen.getByText(/Você 9, Bia 8,5/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dead Fish/ })).toHaveAttribute('href', '/artistas/dead-fish')
    expect(screen.getByText('Nota 10')).toBeInTheDocument()
  })

  it('poucas bandas em comum: não mostra porcentagem', async () => {
    startSession(sessionFor())
    mockApi({ [URL]: { status: 200, body: match({ score: null, sharedCount: 1, bothLike: [] }) } })
    open()

    expect(await screen.findByText(/só uma banda avaliada em comum/)).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('quem ainda não avaliou discos é convidado a avaliar', async () => {
    startSession(sessionFor())
    mockApi({ [URL]: { status: 200, body: match({ myRatedCount: 0, score: null, sharedCount: 0 }) } })
    open()

    expect(await screen.findByRole('link', { name: 'Dê notas a alguns discos' })).toHaveAttribute('href', '/lancamentos')
  })

  it('a outra pessoa sem avaliações: avisa que não dá para comparar', async () => {
    startSession(sessionFor())
    mockApi({ [URL]: { status: 200, body: match({ theirRatedCount: 0, score: null, sharedCount: 0 }) } })
    open()

    expect(await screen.findByText(/ainda não avaliou nenhum disco, então não dá para comparar/)).toBeInTheDocument()
  })

  it('erro do servidor mostra aviso', async () => {
    startSession(sessionFor())
    mockApi({ [URL]: { status: 404, body: { statusCode: 404, code: 'user_not_found', message: 'x' } } })
    open()

    expect(await screen.findByText(/Não foi possível comparar agora/)).toBeInTheDocument()
  })
})
