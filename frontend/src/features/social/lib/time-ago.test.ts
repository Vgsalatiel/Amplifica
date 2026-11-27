import { describe, expect, it } from 'vitest'
import { timeAgo } from './time-ago'

const now = new Date('2026-11-27T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('timeAgo', () => {
  it('escreve o tempo que passou em português', () => {
    expect(timeAgo(ago(20_000), now)).toBe('agora')
    expect(timeAgo(ago(5 * 60_000), now)).toBe('há 5 min')
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('há 3 h')
    expect(timeAgo(ago(24 * 3_600_000), now)).toBe('há 1 dia')
    expect(timeAgo(ago(3 * 24 * 3_600_000), now)).toBe('há 3 dias')
  })

  it('depois de uma semana mostra a data, com o ano só se não for este', () => {
    expect(timeAgo('2026-11-01T12:00:00Z', now)).toMatch(/1 de nov/)
    expect(timeAgo('2025-03-01T12:00:00Z', now)).toMatch(/2025/)
  })

  it('data no futuro (relógio diferente) não vira tempo negativo', () => {
    expect(timeAgo(new Date(now.getTime() + 60_000).toISOString(), now)).toBe('agora')
  })
})
