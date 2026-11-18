import { z } from 'zod';

/** Links ficam de fora do mural: spam e golpe chegam por aí. Grupos externos têm fluxo próprio, com moderação. */
const LINK_PATTERN = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|gg|me|ly|link)(\/|\b)/i;

export const createCommentSchema = z.object({
  body: z
    .string('Escreva o comentário.')
    .trim()
    .min(1, 'Escreva o comentário.')
    .max(500, 'O comentário pode ter até 500 caracteres.')
    .refine((text) => !LINK_PATTERN.test(text), {
      message: 'Links não são permitidos no mural.',
    }),
});

export const listCommentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const reportCommentSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(200, 'O motivo pode ter até 200 caracteres.')
    .optional()
    .transform((text) => (text ? text : undefined)),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsSchema>;
export type ReportCommentDto = z.infer<typeof reportCommentSchema>;
