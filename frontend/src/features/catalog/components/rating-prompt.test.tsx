import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, startSession } from '../../../lib/session'
import { mockApi, renderRoutes, sessionFor } from '../../../test/helpers'
import { notFound, review } from '../../../test/fixtures'
import { RatingPrompt } from './rating-prompt'

const routes = [
  { path: '/lancamentos/sempiternal', element: <RatingPrompt slug="sempiternal" releaseDate="2013-03-29" /> },
  { path: '/lancamentos/futuro', element: <RatingPrompt slug="futuro" releaseDate="2999-01-01" /> },
  { path: '/cadastro', element: <p>Tela de cadastro</p> },
  { path: '/entrar', element: <p>Tela de login</p> },
]

const noReview = { status: 404, body: { statusCode: 404, code: 'review_not_found', message: 'Você ainda não avaliou este disco.' } }

describe('RatingPrompt', () => {
  it('convida o visitante a criar conta e lembra de qual disco ele veio', () => {
    endSession()
    const { router } = renderRoutes(routes, '/lancamentos/sempiternal')

    expect(screen.getByText(/Para ver discos, bandas e gêneros, você não precisa de conta/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Criar conta' }))

    expect(screen.getByText('Tela de cadastro')).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/lancamentos/sempiternal' })
  })

  it('o botão de entrar também volta ao disco', () => {
    endSession()
    const { router } = renderRoutes(routes, '/lancamentos/sempiternal')

    fireEvent.click(screen.getByRole('link', { name: 'Entrar' }))

    expect(router.state.location.pathname).toBe('/entrar')
    expect(router.state.location.state).toEqual({ from: '/lancamentos/sempiternal' })
  })

  it('não mostra nada enquanto a sessão é verificada', () => {
    const { container } = renderRoutes(routes, '/lancamentos/sempiternal')

    expect(container).toBeEmptyDOMElement()
  })

  it('quem está logado e ainda não avaliou vê o formulário vazio', async () => {
    startSession(sessionFor())
    mockApi({ 'GET /releases/sempiternal/reviews/me': noReview })
    renderRoutes(routes, '/lancamentos/sempiternal')

    expect(await screen.findByRole('button', { name: 'Publicar avaliação' })).toBeInTheDocument()
    expect(screen.getByLabelText('Sua resenha (opcional)')).toHaveValue('')
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('quem já avaliou vê a nota e o texto de antes, prontos para editar', async () => {
    startSession(sessionFor())
    mockApi({ 'GET /releases/sempiternal/reviews/me': { status: 200, body: review({ rating: 7, body: 'Bom.' }) } })
    renderRoutes(routes, '/lancamentos/sempiternal')

    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Nota 7' })).toBeChecked()
    expect(screen.getByLabelText('Sua resenha (opcional)')).toHaveValue('Bom.')
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('disco que ainda não saiu não recebe nota', () => {
    endSession()
    renderRoutes(routes, '/lancamentos/futuro')

    expect(screen.getByText(/ainda não foi lançado, então ainda não pode receber nota/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
  })

  it('avisa quando não consegue carregar a avaliação e deixa tentar de novo', async () => {
    startSession(sessionFor())
    mockApi({ 'GET /releases/sempiternal/reviews/me': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } } })
    renderRoutes(routes, '/lancamentos/sempiternal')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar sua avaliação')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('um 404 genérico não é tratado como "ainda não avaliou"', async () => {
    startSession(sessionFor())
    mockApi({ 'GET /releases/sempiternal/reviews/me': notFound })
    renderRoutes(routes, '/lancamentos/sempiternal')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('ao publicar a primeira avaliação, o aviso "salva" continua na tela', async () => {
    startSession(sessionFor())
    mockApi({
      'GET /releases/sempiternal/reviews/me': [noReview, { status: 200, body: review({ rating: 8 }) }],
      'PUT /releases/sempiternal/reviews/me': { status: 200, body: review({ rating: 8 }) },
    })
    renderRoutes(routes, '/lancamentos/sempiternal')

    fireEvent.click(await screen.findByRole('radio', { name: 'Nota 8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }))

    // Depois de salvar a avaliação é recarregada; o formulário vira "Salvar alterações" sem perder o aviso.
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Avaliação salva.')
  })

  it('depois de apagar, o formulário volta ao estado de quem ainda não avaliou', async () => {
    startSession(sessionFor())
    mockApi({
      'GET /releases/sempiternal/reviews/me': [{ status: 200, body: review({ rating: 8, body: 'Bom.' }) }, noReview],
      'DELETE /releases/sempiternal/reviews/me': { status: 204 },
    })
    renderRoutes(routes, '/lancamentos/sempiternal')

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByRole('button', { name: 'Publicar avaliação' })).toBeInTheDocument()
    expect(screen.getByLabelText('Sua resenha (opcional)')).toHaveValue('')
    expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument()
  })
})
