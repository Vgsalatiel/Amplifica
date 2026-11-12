import { describe, expect, it } from 'vitest'
import type { GenreNode } from '../../../types/api'
import { flattenGenres, idsWithDescendants } from './genre-options'

function node(id: string, children: GenreNode[] = []): GenreNode {
  return { id, name: id.toUpperCase(), slug: id, description: null, parentId: null, children }
}

const tree = [node('metal', [node('metalcore', [node('melodic')]), node('deathcore')]), node('emo')]

describe('flattenGenres', () => {
  it('lista em ordem de leitura, com a profundidade de cada gênero', () => {
    expect(flattenGenres(tree).map(({ id, depth }) => `${depth}:${id}`)).toEqual([
      '0:metal',
      '1:metalcore',
      '2:melodic',
      '1:deathcore',
      '0:emo',
    ])
  })
})

describe('idsWithDescendants', () => {
  it('inclui o gênero e todos os níveis abaixo dele', () => {
    expect([...idsWithDescendants(tree, 'metal')].sort()).toEqual(['deathcore', 'melodic', 'metal', 'metalcore'])
    expect([...idsWithDescendants(tree, 'metalcore')].sort()).toEqual(['melodic', 'metalcore'])
  })

  it('devolve vazio para um id que não existe', () => {
    expect(idsWithDescendants(tree, 'nada').size).toBe(0)
  })
})
