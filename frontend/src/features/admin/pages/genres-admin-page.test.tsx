import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GenreNode } from '../../../types/api'
import { mockApi, renderWithProviders } from '../../../test/helpers'
import { GenresAdminPage } from './genres-admin-page'

const node = (id: string, name: string, children: GenreNode[] = [], parentId: string | null = null): GenreNode => ({
  id,
  name,
  slug: id,
  description: null,
  parentId,
  children,
})
const tree = [node('metal', 'Metal', [node('metalcore', 'Metalcore', [], 'metal')]), node('emo', 'Emo')]

describe('GenresAdminPage', () => {
  it('lista a árvore e cria um gênero', async () => {
    const fetchMock = mockApi({
      'GET /genres': { status: 200, body: tree },
      'POST /genres': { status: 201, body: node('post-rock', 'Post Rock') },
    })
    renderWithProviders(<GenresAdminPage />)

    expect(await screen.findByRole('button', { name: 'Editar Metalcore' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Post Rock ' } })
    fireEvent.change(screen.getByLabelText('Subgênero de'), { target: { value: 'emo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar gênero' }))

    expect(await screen.findByText('Gênero salvo.')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]?.body as string)).toEqual({ name: 'Post Rock', description: '', parentId: 'emo' })
  })

  it('mostra no campo o erro de nome repetido', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'POST /genres': {
        status: 409,
        body: {
          statusCode: 409,
          code: 'genre_name_taken',
          message: 'Já existe um gênero com esse nome.',
          details: [{ field: 'name', message: 'Já existe um gênero com esse nome.' }],
        },
      },
    })
    renderWithProviders(<GenresAdminPage />)
    await screen.findByRole('button', { name: 'Editar Metalcore' })

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Emo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar gênero' }))

    expect(await screen.findByText('Já existe um gênero com esse nome.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explica por que um gênero em uso não pode ser excluído', async () => {
    mockApi({
      'GET /genres': { status: 200, body: tree },
      'DELETE /genres/metal': {
        status: 409,
        body: {
          statusCode: 409,
          code: 'genre_in_use',
          message: 'Não dá para excluir "Metal": há 1 subgênero(s) ligados a ele.',
        },
      },
    })
    renderWithProviders(<GenresAdminPage />)
    await screen.findByRole('button', { name: 'Editar Metalcore' })

    const metalRow = screen.getByRole('button', { name: 'Editar Metal' }).closest('li')!
    fireEvent.click(within(metalRow).getByRole('button', { name: 'Excluir' }))
    fireEvent.click(within(metalRow).getByRole('button', { name: 'Sim, excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('há 1 subgênero(s) ligados a ele')
  })

  it('ao editar, não oferece o próprio gênero nem os subgêneros como pai', async () => {
    mockApi({ 'GET /genres': { status: 200, body: tree } })
    renderWithProviders(<GenresAdminPage />)
    await screen.findByRole('button', { name: 'Editar Metalcore' })

    const parent = screen.getByLabelText('Subgênero de')
    expect(within(parent).getAllByRole('option').map((option) => option.textContent?.trim())).toEqual([
      'Nenhum (gênero principal)',
      'Metal',
      'Metalcore',
      'Emo',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Editar Metal' }))

    expect(within(parent).getAllByRole('option').map((option) => option.textContent?.trim())).toEqual([
      'Nenhum (gênero principal)',
      'Emo',
    ])
    expect(screen.getByLabelText('Nome')).toHaveValue('Metal')
  })
})
