import type { ApiErrorDetail } from '../types/api'
import { trackRequest } from './slow-requests'

/**
 * Camada HTTP mais baixa: monta a URL, envia JSON e converte erros da API em ApiError.
 * Não sabe nada sobre sessão; quem cuida disso é o api-client.
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

/** Erro devolvido pela API, no formato único `{ statusCode, code, message, details? }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Corpo enviado como JSON. */
  json?: unknown
  /** Envio de arquivo (multipart). O navegador define o cabeçalho com a fronteira correta. */
  form?: FormData
  /** Token de acesso, quando a rota exige login. */
  token?: string | null
}

export async function httpRequest<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const finish = trackRequest()
  try {
    return await send<T>(path, options)
  } finally {
    finish()
  }
}

async function send<T>(path: string, options: HttpOptions): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.form ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
  })

  // 204 não tem corpo; e o corpo pode não ser JSON (uma página de erro do proxy, por exemplo).
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response.status, body)
  }

  return body as T
}

function toApiError(status: number, body: unknown): ApiError {
  if (typeof body === 'object' && body !== null) {
    const { code, message, details } = body as Record<string, unknown>
    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError(status, code, message, Array.isArray(details) ? (details as ApiErrorDetail[]) : [])
    }
  }
  return new ApiError(status, 'unexpected_response', 'Não foi possível falar com o servidor. Tente de novo.')
}
