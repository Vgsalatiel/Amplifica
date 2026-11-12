import { ApiError } from './http'

export type FieldErrors = Record<string, string>

/** Erros por campo vindos da API (`details`), prontos para os componentes de formulário. */
export function fieldErrorsFrom(error: unknown): FieldErrors {
  const errors: FieldErrors = {}
  if (error instanceof ApiError) {
    for (const detail of error.details) {
      // Fica com a primeira mensagem de cada campo.
      errors[detail.field] ??= detail.message
    }
  }
  return errors
}

/**
 * Mensagem geral do formulário. Quando a API já explicou o problema campo a campo,
 * não repetimos uma mensagem genérica no topo.
 */
export function formMessageFrom(error: unknown): string | null {
  if (!error) {
    return null
  }
  if (error instanceof ApiError) {
    return error.details.length > 0 ? null : error.message
  }
  return 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.'
}
