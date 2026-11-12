import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';

const genreFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Digite o nome do gênero.')
    .max(60, 'O nome pode ter até 60 caracteres.'),
  // Opcional: sem ele, o endereço é gerado a partir do nome.
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, 'A descrição pode ter até 500 caracteres.')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  // `null` torna o gênero uma raiz da árvore.
  parentId: z.uuid('Gênero pai inválido.').nullable().optional(),
};

export const createGenreSchema = z.object(genreFields);
export const updateGenreSchema = z.object(genreFields).partial();

export type CreateGenreDto = z.infer<typeof createGenreSchema>;
export type UpdateGenreDto = z.infer<typeof updateGenreSchema>;
