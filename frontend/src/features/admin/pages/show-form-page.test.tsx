import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GenreNode, Show, ShowImportPreview } from '../../../types/api'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { EditShowPage, NewShowPage } from './show-form-page'

const genres: GenreNode[] = [
  {
    id: 'g1',
    name: 'Metal',
    slug: 'metal',
    description: null,
    parentId: null,
    children: [],
  },
]
const created: Show = {
  id: 's1',
  slug: 'e2e-festival-goiania-2027-05-10',
  name: 'Festival',
  date: '2027-05-10',
  startTime: null,
  venue: 'Arena',
  city: 'Goiânia',
  state: 'GO',
  status: 'CONFIRMED',
  ticketUrl: null,
  verifiedAt: '2026-11-13T00:00:00.000Z',
  acts: [
    {
      position: 0,
      name: 'Vidro Fosco',
      artist: {
        id: 'a1',
        name: 'Vidro Fosco',
        slug: 'vidro-fosco',
        image: null,
      },
    },
  ],
  genres: [],
}
const search = {
  status: 200,
  body: {
    items: [
      {
        id: 'a1',
        name: 'Vidro Fosco',
        slug: 'vidro-fosco',
        type: 'BAND',
        country: null,
        image: null,
        genres: [],
      },
    ],
    meta: { page: 1, limit: 8, total: 1, totalPages: 1 },
  },
}

const newRoutes = [
  { path: '/admin/shows/novo', element: <NewShowPage /> },
  { path: '/admin/shows/:slug', element: <p>Editando o show criado</p> },
]

describe('NewShowPage', () => {
  it('monta o show com banda do catálogo e banda de fora e envia para a API', async () => {
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: genres },
      'GET /artists?q=vidro&limit=8': search,
      'POST /shows': { status: 201, body: created },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.change(screen.getByLabelText('Buscar banda do catálogo'), {
      target: { value: 'vidro' },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Vidro Fosco' }))
    fireEvent.change(screen.getByLabelText('Banda de fora do catálogo'), {
      target: { value: ' Banda Visitante ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar banda de fora' }))

    expect(screen.getByLabelText('Nome da banda 1')).toHaveValue('Vidro Fosco')
    expect(screen.getByLabelText('Nome da banda 2')).toHaveValue('Banda Visitante')

    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2027-05-10' },
    })
    fireEvent.change(screen.getByLabelText('Local'), {
      target: { value: ' Arena ' },
    })
    fireEvent.change(screen.getByLabelText('Cidade'), {
      target: { value: 'Goiânia' },
    })
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'GO' },
    })
    fireEvent.click(await screen.findByLabelText('Metal'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar show' }))

    expect(await screen.findByText('Editando o show criado')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]?.body as string)).toMatchObject({
      name: '',
      date: '2027-05-10',
      startTime: '',
      venue: 'Arena',
      city: 'Goiânia',
      state: 'GO',
      ticketUrl: '',
      status: 'CONFIRMED',
      acts: [
        { name: 'Vidro Fosco', artistId: 'a1' },
        { name: 'Banda Visitante', artistId: null },
      ],
      genreIds: ['g1'],
    })
  })

  it('Enter no campo de banda de fora adiciona a banda e não envia o formulário', async () => {
    const fetchMock = mockApi({ 'GET /genres': { status: 200, body: genres } })
    renderRoutes(newRoutes, '/admin/shows/novo')

    const field = screen.getByLabelText('Banda de fora do catálogo')
    fireEvent.change(field, { target: { value: 'Banda Visitante' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(screen.getByLabelText('Nome da banda 1')).toHaveValue('Banda Visitante')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('não envia sem bandas e explica o motivo', async () => {
    const fetchMock = mockApi({ 'GET /genres': { status: 200, body: genres } })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.click(screen.getByRole('button', { name: 'Criar show' }))

    expect(await screen.findByText('Informe ao menos uma banda.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('mostra o erro de cada campo devolvido pela API', async () => {
    mockApi({
      'GET /genres': { status: 200, body: genres },
      'POST /shows': {
        status: 400,
        body: {
          statusCode: 400,
          code: 'validation_error',
          message: 'Dados inválidos.',
          details: [{ field: 'city', message: 'Digite a cidade.' }],
        },
      },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.change(screen.getByLabelText('Banda de fora do catálogo'), {
      target: { value: 'Banda' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar banda de fora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar show' }))

    expect(await screen.findByText('Digite a cidade.')).toBeInTheDocument()
  })

  it('reordena e remove bandas da escalação', () => {
    mockApi({ 'GET /genres': { status: 200, body: genres } })
    renderRoutes(newRoutes, '/admin/shows/novo')
    const field = screen.getByLabelText('Banda de fora do catálogo')
    for (const name of ['Primeira', 'Segunda']) {
      fireEvent.change(field, { target: { value: name } })
      fireEvent.keyDown(field, { key: 'Enter' })
    }

    fireEvent.click(screen.getByRole('button', { name: 'Subir banda 2' }))
    expect(screen.getByLabelText('Nome da banda 1')).toHaveValue('Segunda')

    fireEvent.click(screen.getByRole('button', { name: 'Remover banda 1' }))
    expect(screen.getByLabelText('Nome da banda 1')).toHaveValue('Primeira')
    expect(screen.queryByLabelText('Nome da banda 2')).not.toBeInTheDocument()
  })
})

describe('Importar de um link', () => {
  const preview: ShowImportPreview = {
    source: 'www.exemplo-ingressos.test',
    sourceUrl: 'https://www.exemplo-ingressos.test/evento/1',
    structured: true,
    name: 'Festival',
    date: '2027-05-10',
    startTime: '17:00',
    venue: 'Arena',
    city: 'Goiânia',
    state: 'GO',
    ticketUrl: 'https://www.exemplo-ingressos.test/evento/1',
    status: 'CONFIRMED',
    acts: [{ name: 'Vidro Fosco', artistId: 'a1' }],
    warnings: ['O site marca este evento como adiado ou reagendado: confira a data na página antes de salvar.'],
    existingShowSlug: 'show-que-ja-existe',
  }

  it('preenche o formulário com a sugestão, mostra os avisos e não salva nada', async () => {
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: genres },
      'POST /shows/import-preview': { status: 200, body: preview },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.change(screen.getByLabelText('Link da página do evento'), {
      target: { value: ' https://www.exemplo-ingressos.test/evento/1 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar dados' }))

    expect(await screen.findByText(/Dados lidos de www.exemplo-ingressos.test/)).toBeInTheDocument()
    expect(screen.getByLabelText('Local')).toHaveValue('Arena')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Goiânia')
    expect(screen.getByLabelText('Estado')).toHaveValue('GO')
    expect(screen.getByLabelText('Data')).toHaveValue('2027-05-10')
    expect(screen.getByLabelText('Nome da banda 1')).toHaveValue('Vidro Fosco')
    expect(screen.getByText(/adiado ou reagendado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir o show existente' })).toHaveAttribute(
      'href',
      '/admin/shows/show-que-ja-existe',
    )

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${String(url)}`)
    expect(calls).toContain('POST /api/v1/shows/import-preview')
    expect(calls).not.toContain('POST /api/v1/shows')
    const request = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/import-preview'))!
    expect(JSON.parse(request[1]?.body as string)).toEqual({
      url: 'https://www.exemplo-ingressos.test/evento/1',
    })
  })

  it('Enter no campo do link busca os dados em vez de salvar o show', async () => {
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: genres },
      'POST /shows/import-preview': {
        status: 200,
        body: { ...preview, existingShowSlug: null, warnings: [] },
      },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    const field = screen.getByLabelText('Link da página do evento')
    fireEvent.change(field, {
      target: { value: 'https://www.exemplo-ingressos.test/evento/1' },
    })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(await screen.findByLabelText('Local')).toHaveValue('Arena')
    expect(fetchMock.mock.calls.some(([url, init]) => init?.method === 'POST' && String(url).endsWith('/shows'))).toBe(
      false,
    )
  })

  it('explica quando o site não informa os dados do evento', async () => {
    mockApi({
      'GET /genres': { status: 200, body: genres },
      'POST /shows/import-preview': {
        status: 200,
        body: {
          ...preview,
          structured: false,
          date: null,
          venue: null,
          city: null,
          state: null,
          acts: [],
          warnings: [
            'Esta página não publica os dados do evento em formato legível: preencha data, local e bandas à mão.',
          ],
          existingShowSlug: null,
        },
      },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.change(screen.getByLabelText('Link da página do evento'), {
      target: { value: 'https://www.exemplo-ingressos.test/evento/2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar dados' }))

    expect(await screen.findByText(/não informa os dados do evento/)).toBeInTheDocument()
    expect(screen.getByLabelText('Local')).toHaveValue('')
  })

  it('mostra a mensagem da API quando a página não pode ser lida', async () => {
    mockApi({
      'GET /genres': { status: 200, body: genres },
      'POST /shows/import-preview': {
        status: 422,
        body: {
          statusCode: 422,
          code: 'import_blocked_by_robots',
          message:
            'O site pede, no robots.txt, que visitantes automáticos não leiam esta página. Cadastre o show à mão.',
        },
      },
    })
    renderRoutes(newRoutes, '/admin/shows/novo')

    fireEvent.change(screen.getByLabelText('Link da página do evento'), {
      target: { value: 'https://www.fechado.test/evento' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar dados' }))

    expect(await screen.findByText(/Cadastre o show à mão/)).toBeInTheDocument()
  })

  it('só aparece ao criar: na edição de um show não há importação', async () => {
    mockApi({
      'GET /shows/e2e-festival-goiania-2027-05-10': {
        status: 200,
        body: created,
      },
      'GET /genres': { status: 200, body: genres },
    })
    renderRoutes(
      [{ path: '/admin/shows/:slug', element: <EditShowPage /> }],
      '/admin/shows/e2e-festival-goiania-2027-05-10',
    )

    await screen.findByLabelText('Nome da banda 1')
    expect(screen.queryByLabelText('Link da página do evento')).not.toBeInTheDocument()
  })
})

describe('EditShowPage', () => {
  const editRoutes = [{ path: '/admin/shows/:slug', element: <EditShowPage /> }]

  it('abre o show para edição com os dados atuais', async () => {
    mockApi({
      'GET /shows/e2e-festival-goiania-2027-05-10': {
        status: 200,
        body: created,
      },
      'GET /genres': { status: 200, body: genres },
    })
    renderRoutes(editRoutes, '/admin/shows/e2e-festival-goiania-2027-05-10')

    expect(await screen.findByLabelText('Nome da banda 1')).toHaveValue('Vidro Fosco')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Goiânia')
    expect(screen.getByLabelText('Conferido em')).toHaveValue('2026-11-13')
  })

  it('avisa quando o show não existe', async () => {
    mockApi({
      'GET /shows/nao-existe': {
        status: 404,
        body: {
          statusCode: 404,
          code: 'show_not_found',
          message: 'Esse show não existe.',
        },
      },
    })
    renderRoutes(editRoutes, '/admin/shows/nao-existe')

    expect(await screen.findByText('Esse show não existe.')).toBeInTheDocument()
  })
})
