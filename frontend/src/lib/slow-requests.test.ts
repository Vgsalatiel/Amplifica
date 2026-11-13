import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SLOW_AFTER_MS, slowRequestStore, trackRequest } from './slow-requests'

describe('slowRequestStore', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('só avisa depois que a chamada passa do limite e some quando ela termina', () => {
    const finish = trackRequest()
    expect(slowRequestStore.getSnapshot()).toBe(false)

    vi.advanceTimersByTime(SLOW_AFTER_MS - 1)
    expect(slowRequestStore.getSnapshot()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(slowRequestStore.getSnapshot()).toBe(true)

    finish()
    expect(slowRequestStore.getSnapshot()).toBe(false)
  })

  it('uma chamada rápida nunca acende o aviso', () => {
    const finish = trackRequest()
    vi.advanceTimersByTime(1000)
    finish()
    vi.advanceTimersByTime(SLOW_AFTER_MS * 2)

    expect(slowRequestStore.getSnapshot()).toBe(false)
  })

  it('com duas chamadas lentas, só apaga quando as duas terminam; encerrar duas vezes não desconta duas vezes', () => {
    const first = trackRequest()
    const second = trackRequest()
    vi.advanceTimersByTime(SLOW_AFTER_MS)

    first()
    first()
    expect(slowRequestStore.getSnapshot()).toBe(true)
    second()
    expect(slowRequestStore.getSnapshot()).toBe(false)
  })

  it('avisa os interessados quando o estado muda', () => {
    const listener = vi.fn()
    const unsubscribe = slowRequestStore.subscribe(listener)
    const finish = trackRequest()
    vi.advanceTimersByTime(SLOW_AFTER_MS)
    finish()
    unsubscribe()

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
