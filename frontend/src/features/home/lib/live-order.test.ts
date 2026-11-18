import { describe, expect, it } from 'vitest'
import { mergeOrder } from './live-order'

describe('mergeOrder', () => {
  it('na primeira vez, usa a ordem da API', () => {
    expect(mergeOrder([], ['a', 'b', 'c'], undefined)).toEqual(['a', 'b', 'c'])
  })

  it('um clipe novo entra logo depois do que está tocando, e o mais novo vem primeiro', () => {
    expect(mergeOrder(['a', 'b', 'c', 'd'], ['n2', 'n1', 'a', 'b', 'c', 'd'], 'b')).toEqual([
      'a',
      'b',
      'n2',
      'n1',
      'c',
      'd',
    ])
  })

  it('sem nada novo, mantém a ordem atual, mesmo que a API traga outra', () => {
    const previous = ['a', 'n1', 'b']
    expect(mergeOrder(previous, ['a', 'b', 'n1'], 'a')).toBe(previous)
  })

  it('quem sumiu da API sai da fila', () => {
    expect(mergeOrder(['a', 'b', 'c'], ['a', 'c'], 'a')).toEqual(['a', 'c'])
  })

  it('se o clipe que toca saiu, o novo entra no começo', () => {
    expect(mergeOrder(['a', 'b'], ['n', 'b'], 'a')).toEqual(['n', 'b'])
  })

  it('se a lista mudou por completo, vale a da API', () => {
    expect(mergeOrder(['x', 'y'], ['a', 'b'], 'x')).toEqual(['a', 'b'])
  })
})
