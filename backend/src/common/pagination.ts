import { z } from 'zod';

/** Parâmetros de paginação aceitos por toda listagem: `?page=2&limit=20`. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function paginate<T>(
  items: T[],
  total: number,
  { page, limit }: Pagination,
): Paginated<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/** `skip` e `take` do Prisma para a página pedida. */
export function toSkipTake({ page, limit }: Pagination): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * limit, take: limit };
}
