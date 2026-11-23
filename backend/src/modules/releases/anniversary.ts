/**
 * Faixas de datas dos discos que fazem aniversário de lançamento neste mês: para cada "N anos", o
 * mês de hoje N anos atrás. Ex.: em novembro de 2026, 10 anos é novembro de 2016.
 */
export function anniversaryRanges(
  now: Date,
  years: number[],
): Array<{ gte: Date; lt: Date }> {
  const month = now.getUTCMonth();
  return [...new Set(years)]
    .filter((age) => Number.isInteger(age) && age > 0)
    .map((age) => {
      const year = now.getUTCFullYear() - age;
      return {
        gte: new Date(Date.UTC(year, month, 1)),
        lt: new Date(Date.UTC(year, month + 1, 1)),
      };
    });
}
