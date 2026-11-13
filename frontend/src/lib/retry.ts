import { ApiError } from './http'

const GATEWAY_ERRORS = new Set([502, 503, 504])

/** O servidor ainda estava acordando (o proxy responde 502, 503 ou 504) ou não houve resposta nenhuma. */
function isWakingUp(error: unknown): boolean {
  return !(error instanceof ApiError) || GATEWAY_ERRORS.has(error.status)
}

/**
 * Quando refazer uma consulta que falhou. Erros do cliente (404, 400...) não mudam numa nova
 * tentativa. Servidor acordando ou sem resposta merece mais paciência: até 3 novas tentativas.
 * Outros erros do servidor (500) ganham uma só.
 */
export function shouldRetry(count: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return count < (isWakingUp(error) ? 3 : 1)
}

/** Espera maior entre as tentativas enquanto o servidor acorda; curta nos demais casos. */
export function retryDelay(_count: number, error: unknown): number {
  return isWakingUp(error) ? 3000 : 1000
}
