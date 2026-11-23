import { z } from 'zod';

export const suggestClipSchema = z.object({
  url: z
    .string('Cole o link do clipe no YouTube.')
    .trim()
    .min(1, 'Cole o link do clipe no YouTube.')
    .max(300, 'O link pode ter até 300 caracteres.'),
});

export const listClipsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const reviewListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

/** Aprovar ou recusar, e, se quiser, ligar o clipe a uma banda do catálogo (`null` desliga). */
export const reviewClipSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], 'Escolha aprovar ou recusar.'),
  artistId: z.uuid('Banda inválida.').nullable().optional(),
});

export type SuggestClipDto = z.infer<typeof suggestClipSchema>;
export type ListClipsQuery = z.infer<typeof listClipsSchema>;
export type ReviewListQuery = z.infer<typeof reviewListSchema>;
export type ReviewClipDto = z.infer<typeof reviewClipSchema>;
