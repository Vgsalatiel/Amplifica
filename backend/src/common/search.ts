import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Palavras consideradas por busca: o resto é ignorado, para a consulta não crescer sem limite. */
const MAX_WORDS = 6;

/** Separa a busca em palavras; cada uma precisa aparecer, em qualquer ordem. */
export function searchWords(term: string): string[] {
  return term.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
}

/** Padrão `ILIKE` para "contém esta palavra", com `%`, `_` e `\` do usuário tratados como texto. */
export function containsPattern(word: string): string {
  return `%${word.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * Ids dos artistas cujo nome contém todas as palavras, ignorando acentos e maiúsculas.
 * O Prisma não chama `unaccent`, então a busca é uma consulta direta (parametrizada).
 */
export async function artistIdsMatching(
  prisma: PrismaService,
  term: string,
): Promise<string[]> {
  const conditions = searchWords(term).map(
    (word) =>
      Prisma.sql`unaccent(a."name") ILIKE unaccent(${containsPattern(word)})`,
  );
  if (conditions.length === 0) {
    return [];
  }
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT a."id" FROM "Artist" a WHERE ${Prisma.join(conditions, ' AND ')}`;
  return rows.map((row) => row.id);
}

/**
 * Ids dos lançamentos em que cada palavra aparece no título ou no nome de um dos artistas.
 * "sempiternal bring me" acha o disco mesmo com as palavras em outra ordem.
 */
export async function releaseIdsMatching(
  prisma: PrismaService,
  term: string,
): Promise<string[]> {
  const conditions = searchWords(term).map((word) => {
    const pattern = containsPattern(word);
    return Prisma.sql`(
      unaccent(r."title") ILIKE unaccent(${pattern})
      OR EXISTS (
        SELECT 1 FROM "ReleaseArtist" ra
        JOIN "Artist" a ON a."id" = ra."artistId"
        WHERE ra."releaseId" = r."id" AND unaccent(a."name") ILIKE unaccent(${pattern})
      )
    )`;
  });
  if (conditions.length === 0) {
    return [];
  }
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT r."id" FROM "Release" r WHERE ${Prisma.join(conditions, ' AND ')}`;
  return rows.map((row) => row.id);
}
