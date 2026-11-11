/**
 * Cliente HTTP da aplicação. Toda chamada à API passa por aqui, para que base da URL,
 * tratamento de erro e (a partir da etapa 2) autenticação fiquem em um único lugar.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`A API respondeu com status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  // O corpo pode não ser JSON (por exemplo, uma página de erro de um proxy).
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body as T
}
