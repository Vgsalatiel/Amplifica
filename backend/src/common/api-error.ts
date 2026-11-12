/**
 * Formato único de erro da API. Toda resposta de erro tem este corpo, para que o
 * frontend trate qualquer falha da mesma maneira.
 */
export interface ApiErrorBody {
  statusCode: number;
  /** Código estável, em snake_case, que o frontend pode usar em condições. */
  code: string;
  /** Mensagem em português, pronta para ser exibida. */
  message: string;
  /** Erros por campo, quando o problema está em dados enviados. */
  details?: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Corpo que os services passam às exceções HTTP do Nest: `new ConflictException(apiError(...))`. */
export function apiError(
  code: string,
  message: string,
  details?: ApiErrorDetail[],
): Omit<ApiErrorBody, 'statusCode'> {
  return details ? { code, message, details } : { code, message };
}
