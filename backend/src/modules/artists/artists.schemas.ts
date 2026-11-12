import { z } from 'zod';
import { paginationSchema } from '../../common/pagination.js';
import { slugSchema } from '../../common/slug.js';

/** Texto opcional: vazio vira `null`, para limpar o campo. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

const year = z
  .number('Digite o ano com quatro dígitos.')
  .int('Digite o ano com quatro dígitos.')
  .min(1900, 'O ano deve ser 1900 ou posterior.')
  .max(new Date().getUTCFullYear() + 1, 'Esse ano ainda não chegou.')
  .nullable()
  .optional();

/** Fonte de um texto: um nome legível e um link. Só http e https, para não aceitar `javascript:`. */
export const sourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Digite o nome da fonte.')
    .max(100, 'O nome pode ter até 100 caracteres.'),
  url: z
    .string()
    .trim()
    .max(500, 'O link pode ter até 500 caracteres.')
    .refine((value) => /^https?:\/\/[^\s]+$/i.test(value), {
      message: 'Use um link completo, começando com http:// ou https://.',
    }),
});

const artistFields = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Digite o nome do artista.')
    .max(120, 'O nome pode ter até 120 caracteres.'),
  slug: slugSchema.optional(),
  type: z
    .enum(['BAND', 'SOLO'], 'Escolha banda ou artista solo.')
    .default('BAND'),
  bio: optionalText(5000, 'A bio pode ter até 5.000 caracteres.'),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use o código do país com duas letras, como BR.')
    .nullable()
    .optional(),
  city: optionalText(80, 'A cidade pode ter até 80 caracteres.'),
  formedYear: year,
  disbandedYear: year,
  sources: z.array(sourceSchema).max(10, 'Use até 10 fontes.').optional(),
  genreIds: z
    .array(z.uuid('Gênero inválido.'))
    .max(10, 'Escolha até 10 gêneros.')
    .transform((ids) => [...new Set(ids)])
    .optional(),
});

function checkYears(
  data: { formedYear?: number | null; disbandedYear?: number | null },
  context: z.RefinementCtx,
) {
  if (
    data.formedYear &&
    data.disbandedYear &&
    data.disbandedYear < data.formedYear
  ) {
    context.addIssue({
      code: 'custom',
      path: ['disbandedYear'],
      message: 'O ano de encerramento não pode ser anterior ao de formação.',
    });
  }
}

export const createArtistSchema = artistFields.superRefine(checkYears);
export const updateArtistSchema = artistFields
  .partial()
  // Em uma edição, `type` ausente significa "não mexer", não "voltar para banda".
  .extend({
    type: z.enum(['BAND', 'SOLO'], 'Escolha banda ou artista solo.').optional(),
  })
  .superRefine(checkYears);

export const listArtistsSchema = paginationSchema.extend({
  /** Slug de um gênero. Inclui os artistas dos subgêneros. */
  genre: z.string().trim().min(1).max(80).optional(),
  /** Trecho do nome. */
  q: z.string().trim().min(1).max(80).optional(),
});

export type CreateArtistDto = z.infer<typeof createArtistSchema>;
export type UpdateArtistDto = z.infer<typeof updateArtistSchema>;
export type ListArtistsQuery = z.infer<typeof listArtistsSchema>;
