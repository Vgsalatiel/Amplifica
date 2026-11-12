import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import type { SessionResponse, User } from '../types/api'

export const testUser: User = {
  id: '0193-test',
  email: 'marina@exemplo.com',
  username: 'marina.fz',
  displayName: 'Marina F.',
  bio: null,
  avatar: null,
  role: 'USER',
  createdAt: '2026-11-12T12:00:00.000Z',
}

export function sessionFor(user: User = testUser, accessToken = 'token-de-teste'): SessionResponse {
  return { accessToken, expiresIn: 900, user }
}

/** Renderiza rotas com os mesmos provedores da aplicação, começando em `initialPath`. */
export function renderRoutes(routes: RouteObject[], initialPath = '/') {
  // Um QueryClient novo por teste, para que o cache de um teste não vaze para o outro.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...view, router }
}

export function renderWithProviders(ui: ReactNode, initialPath = '/') {
  return renderRoutes([{ path: '*', element: ui }], initialPath)
}

type MockReply = { status: number; body?: unknown }

/**
 * Substitui o fetch por respostas definidas por rota ("POST /auth/login").
 * Cada rota recebe uma resposta fixa ou uma fila, consumida a cada chamada.
 */
export function mockApi(replies: Record<string, MockReply | MockReply[]>) {
  const queues = new Map(
    Object.entries(replies).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  )

  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input).replace('/api/v1', '')}`
    const entry = queues.get(key)
    if (!entry) {
      return Promise.reject(new Error(`Chamada inesperada nos testes: ${key}`))
    }
    const reply = Array.isArray(entry) ? (entry.length > 1 ? entry.shift()! : entry[0]) : entry
    const body = reply.status === 204 ? null : JSON.stringify(reply.body ?? null)
    return Promise.resolve(new Response(body, { status: reply.status }))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Os cabeçalhos da n-ésima chamada ao fetch (a partir de 0). */
export function headersOfCall(fetchMock: ReturnType<typeof mockApi>, index: number): Record<string, string> {
  return (fetchMock.mock.calls[index][1]?.headers ?? {}) as Record<string, string>
}
