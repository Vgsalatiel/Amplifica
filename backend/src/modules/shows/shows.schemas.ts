import { z } from 'zod';
import { paginationSchema } from '../../common/pagination.js';
import { slugSchema } from '../../common/slug.js';
import { monthRange, parseShowDate } from './show-date.js';
import { BRAZILIAN_STATES } from './states.js';

/** Texto opcional: vazio vira `null`, para limpar o campo. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

const MIN_YEAR = 2000;

/** Dia do show, como "2027-03-15". Aceita shows passados (histórico), mas não datas absurdas. */
export const showDateText = z
  .string('Digite a data do show.')
  .trim()
  .refine((value) => parseShowDate(value) !== null, {
    message: 'Use uma data real, no formato AAAA-MM-DD.',
  })
  .refine(
    (value) => {
      const year = Number(value.slice(0, 4));
      return year >= MIN_YEAR && year <= new Date().getUTCFullYear() + 3;
    },
    { message: 'Essa data está fora do intervalo aceito.' },
  );

const state = z
  .string('Escolha o estado.')
  .trim()
  .toUpperCase()
  .pipe(
    z.enum(
      BRAZILIAN_STATES,
      'Escolha um estado brasileiro (sigla com duas letras).',
    ),
  );

const startTime = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    {
      message: 'Use o horário no formato HH:MM, como 20:00.',
    },
  )
  .nullable()
  .optional();

/** Link do ingresso ou da página do evento. Só http e https, para não aceitar `javascript:`. */
const ticketUrl = z
  .string()
  .trim()
  .max(500, 'O link pode ter até 500 caracteres.')
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || /^https?:\/\/[^\s]+$/i.test(value), {
    message: 'Use um link completo, começando com http:// ou https://.',
  })
  .nullable()
  .optional();

const statusEnum = z.enum(
  ['CONFIRMED', 'SOLD_OUT', 'CANCELLED'],
  'Escolha confirmado, esgotado ou cancelado.',
);

const actSchema = z.object({
  name: z
    .string('Digite o nome da banda.')
    .trim()
    .min(1, 'Digite o nome da banda.')
    .max(120, 'O nome pode ter até 120 caracteres.'),
  /** Banda do catálogo: liga o show à página dela. */
  artistId: z.uuid('Artista inválido.').nullable().optional(),
});

const showFields = z.object({
  name: optionalText(120, 'O nome do evento pode ter até 120 caracteres.'),
  slug: slugSchema.optional(),
  date: showDateText,
  startTime,
  venue: z
    .string('Digite o local.')
    .trim()
    .min(1, 'Digite o local.')
    .max(120, 'O local pode ter até 120 caracteres.'),
  city: z
    .string('Digite a cidade.')
    .trim()
    .min(1, 'Digite a cidade.')
    .max(80, 'A cidade pode ter até 80 caracteres.'),
  state,
  ticketUrl,
  status: statusEnum.default('CONFIRMED'),
  /** Quando a informação foi conferida pela última vez. Sem valor, vale hoje. */
  verifiedAt: showDateText.optional(),
  acts: z
    .array(actSchema)
    .min(1, 'Informe ao menos uma banda.')
    .max(40, 'Use até 40 bandas.'),
  genreIds: z
    .array(z.uuid('Gênero inválido.'))
    .max(10, 'Escolha até 10 gêneros.')
    .transform((ids) => [...new Set(ids)])
    .optional(),
});

export const createShowSchema = showFields;
export const updateShowSchema = showFields
  .partial()
  // Em uma edição, `status` ausente significa "não mexer", não "voltar para confirmado".
  .extend({ status: statusEnum.optional() });

export const listShowsSchema = paginationSchema.extend({
  /** `upcoming` (padrão): de hoje em diante. `past`: já aconteceram. `all`: todos. */
  when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  /** Sigla do estado, como SP. */
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  city: z.string().trim().min(1).max(80).optional(),
  /** Slug de um gênero. Inclui os subgêneros. */
  genre: z.string().trim().min(1).max(80).optional(),
  /** Slug de uma banda do catálogo. */
  artist: z.string().trim().min(1).max(80).optional(),
  /** Mês, como 2027-03. */
  month: z
    .string()
    .trim()
    .refine((value) => monthRange(value) !== null, {
      message: 'Use o mês no formato AAAA-MM.',
    })
    .optional(),
  /** Sem este filtro, shows cancelados ficam de fora da lista. */
  status: statusEnum.optional(),
});

export type CreateShowDto = z.infer<typeof createShowSchema>;
export type UpdateShowDto = z.infer<typeof updateShowSchema>;
export type ListShowsQuery = z.infer<typeof listShowsSchema>;
