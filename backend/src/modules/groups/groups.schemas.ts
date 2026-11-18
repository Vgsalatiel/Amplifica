import { z } from 'zod';

export const suggestGroupSchema = z.object({
  url: z
    .string('Cole o link de convite do grupo.')
    .trim()
    .min(1, 'Cole o link de convite do grupo.')
    .max(300, 'O link pode ter até 300 caracteres.'),
});

export const reviewListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export const reviewGroupSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], 'Escolha aprovar ou recusar.'),
});

export type SuggestGroupDto = z.infer<typeof suggestGroupSchema>;
export type ReviewListQuery = z.infer<typeof reviewListSchema>;
export type ReviewGroupDto = z.infer<typeof reviewGroupSchema>;
