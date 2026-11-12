import { ApiError, httpRequest, type HttpOptions } from './http'
import { getAccessToken, refreshSession } from './session'

export { ApiError } from './http'

/**
 * Cliente da API usado pelas features. Envia o token de acesso quando há sessão e,
 * se a API responder 401 (token vencido), renova a sessão e repete a chamada uma vez.
 * Quem chama não precisa saber que o token expirou.
 */
export async function apiFetch<T>(path: string, options: Omit<HttpOptions, 'token'> = {}): Promise<T> {
  try {
    return await httpRequest<T>(path, { ...options, token: getAccessToken() })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }

    const session = await refreshSession()
    if (!session) {
      throw error
    }
    return httpRequest<T>(path, { ...options, token: session.accessToken })
  }
}
