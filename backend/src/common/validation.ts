import {
  BadRequestException,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { apiError } from './api-error.js';

/**
 * Pipe global de validação. Cada rota declara o esquema Zod do que aceita
 * (`@Body({ schema })`), e este pipe transforma falhas em um 400 com a lista de
 * campos inválidos. Campos desconhecidos são descartados pelo próprio esquema.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new BadRequestException(
        apiError(
          'validation_error',
          'Confira os campos destacados.',
          issues.map((issue) => ({
            field: (issue.path ?? [])
              .map((segment) =>
                typeof segment === 'object' ? segment.key : segment,
              )
              .join('.'),
            message: issue.message,
          })),
        ),
      ),
  });
}
