import { z } from 'zod';
import {
  createShowSchema,
  showDateText,
} from '../../modules/shows/shows.schemas.js';

/**
 * Formato do arquivo de dados de shows. É o ponto de revisão: alguém pesquisa e escreve o
 * arquivo, uma pessoa confere cada show com a página oficial, e só então o script o grava.
 * Os limites são os da API (a mesma validação), para nada falhar depois numa edição no admin.
 */
const showEntrySchema = createShowSchema
  .omit({ slug: true, acts: true, genreIds: true })
  .extend({
    /** Obrigatório no arquivo: diz quando alguém conferiu o show na fonte. */
    verifiedAt: showDateText,
    /** Link da página oficial ou do vendedor. Sem ele, o show não tem como ser conferido. */
    ticketUrl: createShowSchema.shape.ticketUrl
      .unwrap()
      .unwrap()
      .pipe(z.string()),
    acts: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          /** Endereço (slug) da banda no catálogo, quando ela está lá. */
          artist: z.string().trim().min(1).max(80).nullable().optional(),
        }),
      )
      .min(1)
      .max(40),
    /** Endereços (slugs) de gêneros que já existem no banco. */
    genres: z.array(z.string().trim().min(1)).min(1).max(10),
  });

export const showsFileSchema = z.object({
  generatedAt: z.string(),
  /** De onde vieram as informações, para quem for revisar. */
  source: z.string(),
  shows: z.array(showEntrySchema),
});

export type ShowsFile = z.infer<typeof showsFileSchema>;
export type ShowEntry = ShowsFile['shows'][number];
