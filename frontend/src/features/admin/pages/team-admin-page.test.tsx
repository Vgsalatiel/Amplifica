import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoutes } from '../../../test/helpers'
import type { TeamMember } from '../../../types/api'
import { TeamAdminPage } from './team-admin-page'

const team: TeamMember[] = [
  { username: 'vini', displayName: 'Vinícius', role: 'ADMIN' },
  { username: 'lara', displayName: 'Lara M.', role: 'MODERATOR' },
]
const routes = [{ path: '/admin/equipe', element: <TeamAdminPage /> }]

const putOf = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!

describe('TeamAdminPage', () => {
  it('lista a equipe com o papel de cada um e só oferece tirar o papel dos moderadores', async () => {
    mockApi({ 'GET /team': { status: 200, body: team } })
    renderRoutes(routes, '/admin/equipe')

    expect(await screen.findByText('@vini · Administrador')).toBeInTheDocument()
    expect(screen.getByText('@lara · Moderador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tirar o papel de moderador de @lara' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tirar o papel de moderador de @vini/ })).not.toBeInTheDocument()
  })

  it('promove pelo nome de usuário, limpa o campo e avisa', async () => {
    const fetchMock = mockApi({
      'GET /team': [
        { status: 200, body: team },
        { status: 200, body: [...team, { username: 'ana', displayName: 'Ana', role: 'MODERATOR' }] },
      ],
      'PUT /team/%40ana': { status: 200, body: { username: 'ana', displayName: 'Ana', role: 'MODERATOR' } },
    })
    renderRoutes(routes, '/admin/equipe')
    await screen.findByText('@vini · Administrador')

    fireEvent.change(screen.getByLabelText('Nome de usuário'), { target: { value: ' @ana ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tornar moderador' }))

    expect(await screen.findByText('@ana agora é moderador.')).toBeInTheDocument()
    expect(JSON.parse(putOf(fetchMock)[1]?.body as string)).toEqual({ role: 'MODERATOR' })
    expect(screen.getByLabelText('Nome de usuário')).toHaveValue('')
    expect(await screen.findByText('@ana · Moderador')).toBeInTheDocument()
  })

  it('o botão de promover só liga com algo digitado', async () => {
    mockApi({ 'GET /team': { status: 200, body: team } })
    renderRoutes(routes, '/admin/equipe')
    await screen.findByText('@vini · Administrador')

    expect(screen.getByRole('button', { name: 'Tornar moderador' })).toBeDisabled()
  })

  it('tirar o papel devolve a pessoa a usuário comum', async () => {
    const fetchMock = mockApi({
      'GET /team': [
        { status: 200, body: team },
        { status: 200, body: [team[0]!] },
      ],
      'PUT /team/lara': { status: 200, body: { username: 'lara', displayName: 'Lara M.', role: 'USER' } },
    })
    renderRoutes(routes, '/admin/equipe')

    fireEvent.click(await screen.findByRole('button', { name: 'Tirar o papel de moderador de @lara' }))

    expect(await screen.findByText('@lara voltou a ser usuário comum.')).toBeInTheDocument()
    expect(JSON.parse(putOf(fetchMock)[1]?.body as string)).toEqual({ role: 'USER' })
  })

  it('mostra o erro da API, como conta que não existe', async () => {
    mockApi({
      'GET /team': { status: 200, body: team },
      'PUT /team/ninguem': {
        status: 404,
        body: { statusCode: 404, code: 'user_not_found', message: 'Não existe uma conta com esse nome de usuário.' },
      },
    })
    renderRoutes(routes, '/admin/equipe')
    await screen.findByText('@vini · Administrador')

    fireEvent.change(screen.getByLabelText('Nome de usuário'), { target: { value: 'ninguem' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tornar moderador' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não existe uma conta com esse nome de usuário.')
  })

  it('avisa quando a equipe não carrega', async () => {
    mockApi({ 'GET /team': { status: 403, body: { statusCode: 403, code: 'forbidden', message: 'x' } } })
    renderRoutes(routes, '/admin/equipe')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a equipe.')
  })
})
