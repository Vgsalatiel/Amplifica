import { describe, expect, it } from 'vitest'
import { discovererBadge } from './discoverer-badge'

describe('discovererBadge', () => {
  it('sem clipes aprovados, não há selo', () => {
    expect(discovererBadge(0)).toBeNull()
  })

  it('o primeiro clipe aprovado dá o selo Descobridor e mostra o que falta', () => {
    expect(discovererBadge(1)).toEqual({ label: 'Descobridor', next: { label: 'Garimpeiro', missing: 4 } })
    expect(discovererBadge(4)?.next?.missing).toBe(1)
  })

  it('cinco ou mais viram Garimpeiro, o último nível', () => {
    expect(discovererBadge(5)).toEqual({ label: 'Garimpeiro', next: null })
    expect(discovererBadge(40)?.label).toBe('Garimpeiro')
  })
})
