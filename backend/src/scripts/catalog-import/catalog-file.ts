import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';
import { sourceSchema } from '../../modules/artists/artists.schemas.js';
import { parseReleaseDate } from '../../modules/releases/release-date.js';

/**
 * Formato do arquivo de dados do catálogo. Ele é o ponto de revisão: o script de busca
 * escreve este arquivo, uma pessoa lê e corrige, e só então o script de carga o grava no banco.
 * Os limites são os mesmos da API, para que nada do arquivo falhe depois numa edição pelo admin.
 */
const releaseSchema = z.object({
  /** Release group do MusicBrainz: identifica a obra, não uma edição. */
  mbid: z.string(),
  /** A edição usada para ler as faixas, anotada para conferência. */
  releaseMbid: z.string().nullable(),
  title: z.string().min(1).max(200),
  type: z.enum(['ALBUM', 'EP', 'SINGLE', 'LIVE', 'COMPILATION']),
  releaseDate: z.string().refine((value) => parseReleaseDate(value) !== null, {
    message: 'Data de lançamento inválida.',
  }),
  description: z.string().max(5000).nullable(),
  /** Endereço da capa no Cover Art Archive, quando existe. */
  coverUrl: z.string().url().nullable(),
  tracks: z.array(
    z.object({
      title: z.string().min(1).max(200),
      discNumber: z.number().int().min(1),
      position: z.number().int().min(1),
      durationMs: z.number().int().min(1).max(7_200_000).nullable(),
    }),
  ),
});

export const catalogFileSchema = z.object({
  generatedAt: z.string(),
  source: z.string(),
  artist: z.object({
    mbid: z.string().nullable(),
    name: z.string().min(1).max(120),
    slug: slugSchema,
    type: z.enum(['BAND', 'SOLO']),
    country: z.string().length(2).nullable(),
    city: z.string().max(80).nullable(),
    formedYear: z.number().int().nullable(),
    disbandedYear: z.number().int().nullable(),
    bio: z.string().max(5000).nullable(),
    sources: z.array(sourceSchema).max(10),
    /** Endereços (slugs) de gêneros que já existem no banco. */
    genres: z.array(z.string()),
  }),
  /** Lançamentos que serão gravados no banco. */
  releases: z.array(releaseSchema),
  /**
   * Lançamentos que uma segunda fonte não confirmou. O script de carga os ignora: para
   * publicar um deles, passe-o para `releases` depois de conferir.
   */
  pending: z.array(releaseSchema).default([]),
});

export type CatalogFile = z.infer<typeof catalogFileSchema>;
export type CatalogRelease = CatalogFile['releases'][number];
