import type { DatePrecision } from '../../generated/prisma/client.js';

export interface ParsedReleaseDate {
  date: Date;
  precision: DatePrecision;
}

/**
 * Datas de lançamento chegam e saem da API como texto, com a precisão que se conhece:
 * "2013" (só o ano), "2013-04" (ano e mês) ou "2013-04-01" (dia exato).
 * No banco ficam uma data completa e a precisão; mês e dia desconhecidos viram 01.
 */
export function parseReleaseDate(text: string): ParsedReleaseDate | null {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  const day = match[3] ? Number(match[3]) : 1;
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC "corrige" datas impossíveis (31 de fevereiro vira março): recusa essas.
  const isReal =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isReal || year < 1900 || year > new Date().getUTCFullYear() + 2) {
    return null;
  }

  return { date, precision: match[3] ? 'DAY' : match[2] ? 'MONTH' : 'YEAR' };
}

/** O inverso: devolve só a parte da data que é conhecida. */
export function formatReleaseDate(
  date: Date,
  precision: DatePrecision,
): string {
  const iso = date.toISOString();
  return precision === 'YEAR'
    ? iso.slice(0, 4)
    : precision === 'MONTH'
      ? iso.slice(0, 7)
      : iso.slice(0, 10);
}
