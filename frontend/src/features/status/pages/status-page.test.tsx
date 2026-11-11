import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusPage } from './status-page'

function renderPage() {
  // Um QueryClient novo por teste, para que o cache de um teste não vaze para o outro.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <StatusPage />
    </QueryClientProvider>,
  )
}

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  )
}

describe('StatusPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra que API e banco estão no ar', async () => {
    mockFetch(200, { status: 'ok', database: 'up', timestamp: '2026-11-11T12:00:00.000Z' })

    renderPage()

    expect(await screen.findByText('API e banco no ar')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/v1/health', expect.anything())
  })

  it('avisa quando a API responde mas o banco está fora do ar', async () => {
    mockFetch(503, { status: 'error', database: 'down' })

    renderPage()

    expect(await screen.findByText('API no ar, banco fora do ar')).toBeInTheDocument()
  })

  it('avisa quando a API não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderPage()

    expect(await screen.findByText('API fora do ar')).toBeInTheDocument()
  })
})
