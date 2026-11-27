import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { FollowersPage, FollowingPage } from './follow-list-page'

const person = (username: string, displayName: string) => ({ username, displayName, bio: null, avatar: null, createdAt: '2026-01-01T00:00:00.000Z' })
const routes = [
  { path: '/u/:username/seguidores', element: <FollowersPage /> },
  { path: '/u/:username/seguindo', element: <FollowingPage /> },
]

describe('listas de seguidores e de seguindo', () => {
  it('lista os seguidores, cada um ligado ao próprio perfil', async () => {
    mockApi({ 'GET /users/bia/followers': { status: 200, body: [person('ana', 'Ana'), person('cris', 'Cris')] } })
    renderRoutes(routes, '/u/bia/seguidores')

    expect(await screen.findByRole('heading', { name: 'Seguidores' })).toBeInTheDocument()
    const list = await screen.findByRole('list')
    expect(within(list).getByRole('link', { name: /Ana/ })).toHaveAttribute('href', '/u/ana')
    expect(within(list).getByText('@cris')).toBeInTheDocument()
  })

  it('lista quem a pessoa segue, e avisa quando não segue ninguém', async () => {
    mockApi({ 'GET /users/bia/following': { status: 200, body: [] } })
    renderRoutes(routes, '/u/bia/seguindo')

    expect(await screen.findByRole('heading', { name: 'Seguindo' })).toBeInTheDocument()
    expect(await screen.findByText('@bia ainda não segue ninguém.')).toBeInTheDocument()
  })

  it('perfil inexistente mostra o erro', async () => {
    mockApi({ 'GET /users/nada/followers': { status: 404, body: { statusCode: 404, code: 'user_not_found', message: 'x' } } })
    renderRoutes(routes, '/u/nada/seguidores')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a lista')
  })
})
