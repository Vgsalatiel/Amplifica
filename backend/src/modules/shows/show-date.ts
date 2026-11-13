/**
 * Datas de shows são dias de calendário no Brasil, sem horário. Chegam e saem da API como
 * "AAAA-MM-DD"; no banco, a coluna é do tipo `date` (o Prisma devolve meia-noite UTC).
 */
const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

/** "2027-03-15" → data (meia-noite UTC), ou `null` se o texto ou o dia não existir. */
export function parseShowDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC "corrige" dias impossíveis (31 de fevereiro vira março): recusa esses.
  const isReal =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isReal ? date : null;
}

export function formatShowDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * O dia de hoje no Brasil (e não em UTC): às 22h de 14/03 em São Paulo já é 15/03 em UTC,
 * mas o show de 14/03 ainda não aconteceu. Sem relógio fixo aqui, os testes passam `now`.
 */
export function todayInBrazil(now: Date = new Date()): Date {
  const text = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parseShowDate(text) ?? new Date(NaN);
}

/** "2027-03" → primeiro dia do mês e primeiro dia do mês seguinte (fim exclusivo). */
export function monthRange(month: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  return {
    start: new Date(Date.UTC(year, index, 1)),
    end: new Date(Date.UTC(year, index + 1, 1)),
  };
}
