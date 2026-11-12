import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Digite um nome de exibição.')
  .max(50, 'O nome de exibição pode ter até 50 caracteres.');

export const updateProfileSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: z
      .string()
      .trim()
      .max(280, 'A bio pode ter até 280 caracteres.')
      // Bio vazia significa "sem bio".
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .refine((data) => data.displayName !== undefined || data.bio !== undefined, {
    message: 'Envie ao menos um campo para alterar.',
  });

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
