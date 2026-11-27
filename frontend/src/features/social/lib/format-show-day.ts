/** "5 de março" ou "5 de março de 2027" quando não é este ano. A data é um dia de calendário, sem fuso. */
export function formatShowDay(isoDay: string, now: Date = new Date()): string {
  const date = new Date(`${isoDay.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    return isoDay
  }
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: date.getUTCFullYear() === now.getFullYear() ? undefined : 'numeric',
    timeZone: 'UTC',
  })
}
