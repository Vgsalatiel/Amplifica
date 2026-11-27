import { z } from 'zod';

export const feedQuerySchema = z.object({
  /** Só atividade anterior a este momento (ISO 8601). Vem do `next` da página anterior. */
  before: z.iso
    .datetime({ message: 'Use uma data no formato ISO, como 2026-11-27T12:00:00Z.' })
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;
