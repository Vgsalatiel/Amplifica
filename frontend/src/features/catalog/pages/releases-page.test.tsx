import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { genreNode, page, releaseSummary } from '../../../test/fixtures'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { ReleasesPage } from './releases-page'

const routes = [{ path: '/lancamentos', element: <ReleasesPage /> }]
const open = (search = '') => renderRoutes(routes, `/lancamentos${search}`)
const tree = [genreNode('metal', 'Metal', [genreNode('metalcore', 'Metalcore', [], 'metal')])]
const base = 'GET /releases?page=1&limit=24&sort=recent'

const replies = (extra: Record<string, { status: number; body?: unknown }> = {}) => ({
  'GET /genres': { status: 200, body: tree },
  [base]: { status: 200, body: page([releaseSummary({ rating: { average: 8.5, count: 2 } })]) },
  ...extra,
})

describe('ReleasesPage', () => {
  it('lista os lançamentos com a nota de quem já foi avaliado', async () => {
    mockApi(replies())
    open()

    expect(await screen.findByText('Sempiternal')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nota 8,5 de 10' })).toBeInTheDocument()
    expect(screen.getByText('1 lançamento')).toBeInTheDocument()
  })

  it('escolher um gênero consulta a API e guarda o filtro na URL', async () => {
    mockApi(replies({ 'GET /releases?page=1&limit=24&genre=metalcore&sort=recent': { status: 200, body: page([releaseSummary({ title: 'Do Metalcore', id: 'r9' })]) } }))
    const { router } = open()
    await screen.findByText('Sempiternal')

    fireEvent.change(screen.getByLabelText('Gênero'), { target: { value: 'metalcore' } })

    expect(await screen.findByText('Do Metalcore')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?genre=metalcore')
  })

  it('lê todos os filtros da URL e os mostra nos campos', async () => {
    const fetchMock = mockApi(replies({ 'GET /releases?page=1&limit=24&q=bring&genre=metal&type=EP&year=2013&sort=rating': { status: 200, body: page([releaseSummary()]) } }))
    open('?q=bring&genre=metal&type=EP&year=2013&sort=rating')

    await screen.findByText('Sempiternal')
    expect(screen.getByLabelText('Título ou artista')).toHaveValue('bring')
    expect(screen.getByLabelText('Tipo')).toHaveValue('EP')
    expect(screen.getByLabelText('Ano')).toHaveValue('2013')
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('rating')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/releases?page=1&limit=24&q=bring&genre=metal&type=EP&year=2013&sort=rating', expect.anything())
  })

  it('ignora valores inválidos na URL em vez de quebrar', async () => {
    mockApi(replies())
    open('?type=XYZ&year=abc&sort=aleatorio')

    expect(await screen.findByText('Sempiternal')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toHaveValue('')
    expect(screen.getByLabelText('Ano')).toHaveValue('')
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('recent')
  })

  it('aplica a busca e o ano ao enviar o formulário', async () => {
    mockApi(replies({ 'GET /releases?page=1&limit=24&q=sempiternal&year=2013&sort=recent': { status: 200, body: page([releaseSummary({ title: 'Achado', id: 'r8' })]) } }))
    const { router } = open()
    await screen.findByText('Sempiternal')

    fireEvent.change(screen.getByLabelText('Título ou artista'), { target: { value: ' sempiternal ' } })
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2013' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(await screen.findByText('Achado')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=sempiternal&year=2013')
  })

  it('recusa um ano que não tem 4 dígitos, explicando, sem consultar a API', async () => {
    const fetchMock = mockApi(replies())
    open()
    await screen.findByText('Sempiternal')
    const calls = fetchMock.mock.calls.length

    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(screen.getByLabelText('Ano')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Digite um ano com 4 dígitos, como 2013.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.length).toBe(calls)
  })

  it('sem resultado, sugere tirar um filtro; "Limpar filtros" volta à lista inteira', async () => {
    mockApi(replies({ 'GET /releases?page=1&limit=24&type=SINGLE&sort=recent': { status: 200, body: page([]) } }))
    const { router } = open('?type=SINGLE')

    expect(await screen.findByText(/Nenhum lançamento encontrado com esses filtros/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByText('Sempiternal')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('a ordem por nota fica na URL e some quando volta ao padrão', async () => {
    mockApi(replies({ 'GET /releases?page=1&limit=24&sort=rating': { status: 200, body: page([releaseSummary({ title: 'Melhor', id: 'r7' })]) } }))
    const { router } = open()
    await screen.findByText('Sempiternal')

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'rating' } })
    expect(await screen.findByText('Melhor')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?sort=rating')

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'recent' } })
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('oferece tentar de novo quando o servidor falha', async () => {
    mockApi(replies({ [base]: { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } } }))
    open()

    expect(await screen.findByRole('button', { name: 'Tentar de novo' }, { timeout: 4000 })).toBeInTheDocument()
  })
})
