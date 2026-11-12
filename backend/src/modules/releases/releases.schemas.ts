import { z } from 'zod';
import { paginationSchema } from '../../common/pagination.js';
import { slugSchema } from '../../common/slug.js';
import { contrastWithWhite, MIN_CONTRAST } from '../images/color.js';
import { parseReleaseDate } from './release-date.js';
import { parseYoutubeVideoId } from './youtube.js';

const RELEASE_TYPES = ['ALBUM', 'EP', 'SINGLE', 'LIVE', 'COMPILATION'] as const;

const trackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Digite o título da faixa.')
    .max(200, 'O título pode ter até 200 caracteres.'),
  discNumber: z.number().int().min(1).max(20).default(1),
  position: z
    .number('Informe a posição da faixa.')
    .int()
    .min(1, 'A posição começa em 1.')
    .max(200),
  /** Duração em milissegundos. Até 2 horas, para caber faixas ao vivo longas. */
  durationMs: z.number().int().min(1).max(7_200_000).nullable().optional(),
});

const releaseArtistSchema = z.object({
  artistId: z.uuid('Artista inválido.'),
  role: z.enum(['PRIMARY', 'FEATURED']).default('PRIMARY'),
});

const releaseFields = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Digite o título do lançamento.')
    .max(200, 'O título pode ter até 200 caracteres.'),
  slug: slugSchema.optional(),
  type: z.enum(RELEASE_TYPES, 'Escolha o tipo do lançamento.'),
  /** "2013", "2013-04" ou "2013-04-01": envie só o que se conhece da data. */
  releaseDate: z
    .string()
    .trim()
    .refine((value) => parseReleaseDate(value) !== null, {
      message: 'Use AAAA, AAAA-MM ou AAAA-MM-DD, com uma data que exista.',
    }),
  description: z
    .string()
    .trim()
    .max(5000, 'A descrição pode ter até 5.000 caracteres.')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  /** Link ou id de um vídeo do YouTube. Vazio remove o vídeo. */
  youtube: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === '' || parseYoutubeVideoId(value) !== null, {
      message: 'Cole o link de um vídeo do YouTube.',
    })
    .transform((value) => (value === '' ? null : parseYoutubeVideoId(value)))
    .nullable()
    .optional(),
  /** Cor de destaque da página. `null` volta a usar a cor padrão do site. */
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
    .transform((value) => value.toUpperCase())
    .refine((value) => contrastWithWhite(value) >= MIN_CONTRAST, {
      message:
        'Essa cor é clara demais para texto sobre fundo branco. Escolha um tom mais escuro.',
    })
    .nullable()
    .optional(),
  artists: z
    .array(releaseArtistSchema)
    .min(1, 'Escolha ao menos um artista.')
    .max(10, 'Um lançamento pode ter até 10 artistas.'),
  tracks: z
    .array(trackSchema)
    .max(200, 'Um lançamento pode ter até 200 faixas.')
    .optional(),
});

type ReleaseCheck = Partial<
  Pick<z.infer<typeof releaseFields>, 'artists' | 'tracks'>
>;

function checkRelease(data: ReleaseCheck, context: z.RefinementCtx) {
  if (data.artists) {
    const ids = data.artists.map((artist) => artist.artistId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        path: ['artists'],
        message: 'O mesmo artista aparece mais de uma vez.',
      });
    }
    if (!data.artists.some((artist) => artist.role === 'PRIMARY')) {
      context.addIssue({
        code: 'custom',
        path: ['artists'],
        message: 'Ao menos um artista precisa ser o principal.',
      });
    }
  }

  if (data.tracks) {
    const seen = new Set<string>();
    for (const track of data.tracks) {
      const key = `${track.discNumber}:${track.position}`;
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['tracks'],
          message: `Há duas faixas na posição ${track.position} do disco ${track.discNumber}.`,
        });
        break;
      }
      seen.add(key);
    }
  }
}

export const createReleaseSchema = releaseFields.superRefine(checkRelease);
export const updateReleaseSchema = releaseFields
  .partial()
  .superRefine(checkRelease);

export const listReleasesSchema = paginationSchema.extend({
  type: z.enum(RELEASE_TYPES).optional(),
  /** Slug de um artista. */
  artist: z.string().trim().min(1).max(80).optional(),
});

export type CreateReleaseDto = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseDto = z.infer<typeof updateReleaseSchema>;
export type ListReleasesQuery = z.infer<typeof listReleasesSchema>;
