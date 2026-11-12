import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReleaseDetail } from '../../../types/api'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { NewReleasePage } from './release-form-page'

const routes = [
  { path: '/admin/lancamentos/novo', element: <NewReleasePage /> },
  { path: '/admin/lancamentos/:slug', element: <p>Editando o lançamento criado</p> },
]

const created = {
  id: 'r1',
  title: 'Tudo Que Sobrou',
  slug: 'vidro-fosco-tudo-que-sobrou',
  type: 'ALBUM',
  releaseDate: '2024-06-14',
  datePrecision: 'DAY',
  cover: null,
  accentColor: null,
  rating: { average: null, count: 0 },
  description: null,
  youtubeVideoId: null,
  tracks: [],
  durationMs: null,
  artists: [{ id: 'a1', name: 'Vidro Fosco', slug: 'vidro-fosco', role: 'PRIMARY' }],
} satisfies ReleaseDetail

const search = {
  status: 200,
  body: {
    items: [{ id: 'a1', name: 'Vidro Fosco', slug: 'vidro-fosco', type: 'BAND', country: null, image: null, genres: [] }],
    meta: { page: 1, limit: 8, total: 1, totalPages: 1 },
  },
}

async function addArtist() {
  fireEvent.change(screen.getByLabelText('Buscar artista para adicionar'), { target: { value: 'vidro' } })
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Vidro Fosco' }))
}

describe('ReleaseFormPage (novo)', () => {
  it('monta o lançamento com artista e faixas e envia para a API', async () => {
    const fetchMock = mockApi({
      'GET /artists?q=vidro&limit=8': search,
      'POST /releases': { status: 201, body: created },
    })
    renderRoutes(routes, '/admin/lancamentos/novo')

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: ' Tudo Que Sobrou ' } })
    fireEvent.change(screen.getByLabelText('Data de lançamento'), { target: { value: '2024-06-14' } })
    await addArtist()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar faixa' }))
    fireEvent.change(screen.getByLabelText('Título da faixa 1'), { target: { value: 'Geada' } })
    fireEvent.change(screen.getByLabelText('Duração da faixa 1'), { target: { value: '2:48' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar faixa' }))

    // A segunda faixa já vem numerada.
    expect(screen.getByLabelText('Número da faixa 2')).toHaveValue('2')
    fireEvent.change(screen.getByLabelText('Título da faixa 2'), { target: { value: 'Vidro' } })

    fireEvent.click(screen.getByRole('button', { name: 'Criar lançamento' }))

    expect(await screen.findByText('Editando o lançamento criado')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]?.body as string)).toEqual({
      title: 'Tudo Que Sobrou',
      type: 'ALBUM',
      releaseDate: '2024-06-14',
      description: '',
      youtube: '',
      artists: [{ artistId: 'a1', role: 'PRIMARY' }],
      tracks: [
        { title: 'Geada', discNumber: 1, position: 1, durationMs: 168_000 },
        { title: 'Vidro', discNumber: 1, position: 2, durationMs: null },
      ],
    })
  })

  it('não chama a API sem artista e aponta o campo', () => {
    const fetchMock = mockApi({})
    renderRoutes(routes, '/admin/lancamentos/novo')

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Sem Artista' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar lançamento' }))

    expect(screen.getByLabelText('Buscar artista para adicionar')).toHaveAccessibleDescription(
      'Escolha ao menos um artista.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aponta a duração inválida na faixa certa', async () => {
    mockApi({ 'GET /artists?q=vidro&limit=8': search })
    renderRoutes(routes, '/admin/lancamentos/novo')
    await addArtist()

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar faixa' }))
    fireEvent.change(screen.getByLabelText('Título da faixa 1'), { target: { value: 'Geada' } })
    fireEvent.change(screen.getByLabelText('Duração da faixa 1'), { target: { value: '3:99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar lançamento' }))

    expect(screen.getByText('Use minutos e segundos, como 3:45.')).toBeInTheDocument()
  })

  it('mostra no campo o erro que só a API conhece', async () => {
    mockApi({
      'GET /artists?q=vidro&limit=8': search,
      'POST /releases': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_error',
          message: 'Confira os campos destacados.',
          details: [{ field: 'releaseDate', message: 'Use AAAA, AAAA-MM ou AAAA-MM-DD, com uma data que exista.' }],
        },
      },
    })
    renderRoutes(routes, '/admin/lancamentos/novo')
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Disco' } })
    fireEvent.change(screen.getByLabelText('Data de lançamento'), { target: { value: '2024-02-30' } })
    await addArtist()

    fireEvent.click(screen.getByRole('button', { name: 'Criar lançamento' }))

    expect(await screen.findByText(/Use AAAA, AAAA-MM ou AAAA-MM-DD/)).toBeInTheDocument()
    expect(screen.getByLabelText('Data de lançamento')).toHaveAttribute('aria-invalid', 'true')
  })

  it('permite remover um artista já adicionado', async () => {
    mockApi({ 'GET /artists?q=vidro&limit=8': search })
    renderRoutes(routes, '/admin/lancamentos/novo')
    await addArtist()

    fireEvent.click(screen.getByRole('button', { name: 'Remover Vidro Fosco' }))

    expect(screen.queryByRole('button', { name: 'Remover Vidro Fosco' })).not.toBeInTheDocument()
  })
})
