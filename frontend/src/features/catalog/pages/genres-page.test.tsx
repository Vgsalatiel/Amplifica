import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../../lib/session'
import { mockApi, renderRoutes } from '../../../test/helpers'
import { genreDetail, genreNode, page, artistSummary, notFound } from '../../../test/fixtures'
import { GenrePage } from './genre-page'
import { GenresPage } from './genres-page'

describe('GenresPage', () => {
  it('mostra a árvore inteira com links, sem exigir conta', async () => {
    endSession()
    mockApi({
      'GET /genres': {
        status: 200,
        body: [genreNode('metal', 'Metal', [genreNode('metalcore', 'Metalcore', [genreNode('melodic', 'Melodic Metalcore', [], 'metalcore')], 'metal')]), genreNode('emo', 'Emo')],
      },
    })
    renderRoutes([{ path: '/generos', element: <GenresPage /> }], '/generos')

    expect(await screen.findByRole('link', { name: 'Metal' })).toHaveAttribute('href', '/generos/metal')
    expect(screen.getByRole('link', { name: 'Metalcore' })).toHaveAttribute('href', '/generos/metalcore')
    expect(screen.getByRole('link', { name: 'Melodic Metalcore' })).toHaveAttribute('href', '/generos/melodic')
    expect(screen.getByRole('link', { name: 'Emo' })).toBeInTheDocument()
  })

  it('avisa quando ainda não há gêneros', async () => {
    endSession()
    mockApi({ 'GET /genres': { status: 200, body: [] } })
    renderRoutes([{ path: '/generos', element: <GenresPage /> }], '/generos')

    expect(await screen.findByText('Nenhum gênero cadastrado ainda.')).toBeInTheDocument()
  })
})

describe('GenrePage', () => {
  const open = (slug: string) => renderRoutes([{ path: '/generos/:slug', element: <GenrePage /> }], `/generos/${slug}`)

  it('mostra subgêneros e os artistas do gênero, incluindo os dos subgêneros', async () => {
    endSession()
    mockApi({
      'GET /genres/metal': { status: 200, body: genreDetail({ description: 'Música pesada.' }) },
      'GET /artists?genre=metal&page=1&limit=24': { status: 200, body: page([artistSummary()]) },
    })
    open('metal')

    expect(await screen.findByRole('heading', { level: 1, name: 'Metal' })).toBeInTheDocument()
    expect(screen.getByText('Música pesada.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Subgêneros' })).getByRole('link', { name: 'Metalcore' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Bring Me the Horizon/ })).toBeInTheDocument()
    expect(screen.getByText('Inclui os artistas dos subgêneros.')).toBeInTheDocument()
  })

  it('num subgênero, linka o gênero pai e avisa quando não há artistas', async () => {
    endSession()
    mockApi({
      'GET /genres/metalcore': {
        status: 200,
        body: genreDetail({ id: 'metalcore', name: 'Metalcore', slug: 'metalcore', parent: { id: 'metal', name: 'Metal', slug: 'metal' }, children: [] }),
      },
      'GET /artists?genre=metalcore&page=1&limit=24': { status: 200, body: page([]) },
    })
    open('metalcore')

    expect(await screen.findByRole('link', { name: 'Metal' })).toHaveAttribute('href', '/generos/metal')
    expect(await screen.findByText('Nenhum artista neste gênero ainda.')).toBeInTheDocument()
  })

  it('explica quando o gênero não existe', async () => {
    endSession()
    mockApi({ 'GET /genres/nada': notFound, 'GET /artists?genre=nada&page=1&limit=24': { status: 200, body: page([]) } })
    open('nada')

    expect(await screen.findByRole('heading', { name: 'Esse gênero não existe' })).toBeInTheDocument()
  })
})
