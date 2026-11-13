import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody, ApiErrorDetail } from './api-error.js';

const DEFAULTS: Record<number, { code: string; message: string }> = {
  400: { code: 'bad_request', message: 'Requisição inválida.' },
  401: { code: 'unauthorized', message: 'Entre na sua conta para continuar.' },
  403: { code: 'forbidden', message: 'Você não tem permissão para isso.' },
  404: { code: 'not_found', message: 'Não encontramos o que você procura.' },
  409: { code: 'conflict', message: 'Esse dado já está em uso.' },
  413: {
    code: 'payload_too_large',
    message: 'O arquivo enviado é grande demais.',
  },
  429: {
    code: 'too_many_requests',
    message: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  },
};

const INTERNAL = {
  code: 'internal_error',
  message: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
};

/**
 * Converte qualquer exceção no formato único de erro da API.
 *
 * - Exceções lançadas pelo nosso código já trazem `code` e `message` (ver apiError).
 * - Exceções do próprio Nest (rota inexistente, limite de requisições) recebem um
 *   código e uma mensagem padrão em português.
 * - Erros inesperados viram 500 sem expor detalhes; o erro completo vai para o log.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }

    response.status(body.statusCode).json(body);
  }
}

export function toErrorBody(exception: unknown): ApiErrorBody {
  const statusCode = readStatus(exception);
  if (statusCode === undefined || statusCode >= 500) {
    // 502 (a página lida pela importação de shows falhou) e 503 (banco indisponível) são os
    // únicos 5xx que lançamos de propósito: a mensagem deles explica o que aconteceu.
    if (statusCode === 502 || statusCode === 503) {
      return { statusCode, ...readOwnFields(exception, INTERNAL) };
    }
    return { statusCode: 500, ...INTERNAL };
  }

  const fallback = DEFAULTS[statusCode] ?? DEFAULTS[400];
  return { statusCode, ...readOwnFields(exception, fallback) };
}

function readStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  // Erros do @nestjs/authentication fora de um HttpException trazem `status`.
  if (typeof exception === 'object' && exception !== null) {
    const status = (exception as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return status;
    }
  }
  return undefined;
}

function readOwnFields(
  exception: unknown,
  fallback: { code: string; message: string },
): Omit<ApiErrorBody, 'statusCode'> {
  const payload =
    exception instanceof HttpException ? exception.getResponse() : undefined;

  if (typeof payload !== 'object' || payload === null) {
    return fallback;
  }

  const { code, message, details } = payload as Record<string, unknown>;
  // Só confiamos em `message` quando veio junto de um `code` nosso: as mensagens
  // padrão do Nest são em inglês e não foram escritas para o usuário final.
  if (typeof code !== 'string') {
    return fallback;
  }

  return {
    code,
    message: typeof message === 'string' ? message : fallback.message,
    ...(isDetails(details) ? { details } : {}),
  };
}

function isDetails(value: unknown): value is ApiErrorDetail[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ApiErrorDetail).field === 'string' &&
        typeof (item as ApiErrorDetail).message === 'string',
    )
  );
}
