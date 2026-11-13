import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SLOW_AFTER_MS, trackRequest } from '../../lib/slow-requests'
import { SlowApiNotice } from './slow-api-notice'

describe('SlowApiNotice', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fica escondido, aparece quando a API demora e some quando ela responde', () => {
    render(<SlowApiNotice />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    const finish = trackRequest()
    act(() => {
      vi.advanceTimersByTime(SLOW_AFTER_MS)
    })
    expect(screen.getByRole('status')).toHaveTextContent('O servidor estava em repouso e está acordando')

    act(() => finish())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
