import { z } from 'zod';
import { paginationSchema } from '../../common/pagination.js';

export const MAX_REVIEW_LENGTH = 3000;

/**
 * Corpo de PUT /releases/:slug/reviews/me. A nota é um inteiro de 1 a 10. O texto é opcional:
 * vazio ou só espaços vale como "sem texto", e a avaliação continua contando na média.
 */
export const upsertReviewSchema = z.object({
  rating: z
    .number('Escolha uma nota de 1 a 10.')
    .int('A nota precisa ser um número inteiro, de 1 a 10.')
    .min(1, 'A nota mínima é 1.')
    .max(10, 'A nota máxima é 10.'),
  body: z
    .string()
    .trim()
    .max(
      MAX_REVIEW_LENGTH,
      `A resenha pode ter até ${MAX_REVIEW_LENGTH.toLocaleString('pt-BR')} caracteres.`,
    )
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});

/** Resenhas de um disco: dez por página, para a página do disco não ficar longa demais. */
export const listReviewsSchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type UpsertReviewDto = z.infer<typeof upsertReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsSchema>;
