import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { retryDelay, shouldRetry } from './retry'

const error = (status: number) => new ApiError(status, 'x', 'x')

describe('shouldRetry', () => {
  it('não insiste em erros do cliente', () => {
    expect(shouldRetry(0, error(404))).toBe(false)
    expect(shouldRetry(0, error(400))).toBe(false)
    expect(shouldRetry(0, error(401))).toBe(false)
  })

  it('tem paciência com servidor acordando (502, 503, 504) e com falta de resposta', () => {
    for (const status of [502, 503, 504]) {
      expect(shouldRetry(0, error(status))).toBe(true)
      expect(shouldRetry(2, error(status))).toBe(true)
      expect(shouldRetry(3, error(status))).toBe(false)
    }
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(3, new TypeError('Failed to fetch'))).toBe(false)
  })

  it('dá só uma nova chance a um erro 500', () => {
    expect(shouldRetry(0, error(500))).toBe(true)
    expect(shouldRetry(1, error(500))).toBe(false)
  })
})

describe('retryDelay', () => {
  it('espera mais enquanto o servidor acorda', () => {
    expect(retryDelay(0, error(502))).toBe(3000)
    expect(retryDelay(0, new TypeError('Failed to fetch'))).toBe(3000)
    expect(retryDelay(0, error(500))).toBe(1000)
  })
})
