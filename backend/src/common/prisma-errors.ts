import { Prisma } from '../generated/prisma/client.js';

/** Violação de índice único (por exemplo, slug repetido). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Referência a um registro que não existe (por exemplo, id de artista inválido). */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}

/** Tentativa de alterar ou excluir um registro que não existe. */
export function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}
