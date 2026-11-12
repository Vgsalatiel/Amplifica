import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { notFound, releaseDetail } from '../../../test/fixtures'
import { ReleasePage } from './release-page'

const routes = [{ path: '/lancamentos/:slug', element: <ReleasePage /> }]
const open = (slug = 'bring-me-the-horizon-sempiternal') => renderRoutes(routes, `/lancamentos/${slug}`)

describe('ReleasePage', () => {
  it('mostra título, artista, tipo, data por extenso, faixas e duração', async () => {
    endSession()
    mockApi({ 'GET /releases/bring-me-the-horizon-sempiternal': { status: 200, body: releaseDetail() } })
    open()

    expect(await screen.findByRole('heading', { level: 1, name: 'Sempiternal' })).toBeInTheDocument()
    expect(screen.getByText('Álbum, 29 de março de 2013')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bring Me the Horizon' })).toHaveAttribute('href', '/artistas/bring-me-the-horizon')
    expect(screen.getByText('Can You Feel My Heart')).toBeInTheDocument()
    expect(screen.getByText('3:48')).toBeInTheDocument()
    expect(screen.getByText('58 min')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Capa de Sempiternal' })).toBeInTheDocument()
  })

  it('aplica a cor da capa só dentro da página', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail({ accentColor: '#D8281D' }) } })
    open('x')

    const heading = await screen.findByRole('heading', { level: 1 })
    const themed = heading.closest('[style]') as HTMLElement
    expect(themed.getAttribute('style')).toContain('--color-accent: #D8281D')
    expect(document.body.getAttribute('style') ?? '').not.toContain('--color-accent')
  })

  it('sem cor própria, usa a cor padrão do site', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail({ accentColor: null }) } })
    open('x')

    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading.closest('[style]')).toBeNull()
  })

  it('mostra o vídeo só quando o disco tem um', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail({ youtubeVideoId: 'dQw4w9WgXcQ' }) } })
    const { unmount } = open('x')
    expect(await screen.findByTitle('Vídeo de Sempiternal no YouTube')).toBeInTheDocument()
    unmount()

    mockApi({ 'GET /releases/y': { status: 200, body: releaseDetail({ youtubeVideoId: null }) } })
    open('y')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByTitle(/no YouTube/)).not.toBeInTheDocument()
  })

  it('o visitante vê o convite para criar conta, sem precisar de conta para ver o disco', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail() } })
    open('x')

    expect(await screen.findByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    expect(screen.getByText('Can You Feel My Heart')).toBeInTheDocument()
  })

  it('mostra participações e a descrição quando existem', async () => {
    endSession()
    mockApi({
      'GET /releases/x': {
        status: 200,
        body: releaseDetail({
          description: 'Segundo disco gravado em nove dias.',
          artists: [
            { id: 'a1', name: 'Banda A', slug: 'banda-a', role: 'PRIMARY' },
            { id: 'a2', name: 'Banda B', slug: 'banda-b', role: 'FEATURED' },
          ],
        }),
      },
    })
    open('x')

    expect(await screen.findByText('Segundo disco gravado em nove dias.')).toBeInTheDocument()
    expect(screen.getByText(/^Com/)).toHaveTextContent('Com Banda B')
  })

  it('avisa quando o disco ainda não tem faixas cadastradas', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail({ tracks: [], durationMs: null }) } })
    open('x')

    expect(await screen.findByText(/lista de faixas deste disco ainda não foi cadastrada/)).toBeInTheDocument()
    expect(screen.queryByText('Duração')).not.toBeInTheDocument()
  })

  it('muda o título da aba para o disco', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 200, body: releaseDetail() } })
    open('x')

    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe('Sempiternal, Bring Me the Horizon | Amplifica')
  })

  it('explica quando o disco não existe', async () => {
    endSession()
    mockApi({ 'GET /releases/nada': notFound })
    open('nada')

    expect(await screen.findByRole('heading', { name: 'Esse disco não existe' })).toBeInTheDocument()
  })

  it('oferece tentar de novo quando o servidor falha', async () => {
    endSession()
    mockApi({ 'GET /releases/x': { status: 500, body: { statusCode: 500, code: 'internal_error', message: 'Erro.' } } })
    open('x')

    // A consulta tenta uma segunda vez antes de desistir, então o erro leva cerca de um segundo.
    expect(await screen.findByRole('button', { name: 'Tentar de novo' }, { timeout: 4000 })).toBeInTheDocument()
  })
})
