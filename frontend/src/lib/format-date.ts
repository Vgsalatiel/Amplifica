import type { DatePrecision } from '../types/api'

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * Data de lançamento por extenso, só com a parte que se conhece:
 * "2013" vira "2013", "2013-03" vira "março de 2013" e "2013-03-29" vira "29 de março de 2013".
 * Feita à mão, sem Date, para o fuso horário do navegador nunca deslocar o dia.
 */
export function formatReleaseDate(releaseDate: string, precision: DatePrecision): string {
  const [year, month, day] = releaseDate.split('-')
  if (precision === 'YEAR' || !month) {
    return year
  }
  const monthName = MONTHS[Number(month) - 1] ?? month
  return precision === 'MONTH' || !day ? `${monthName} de ${year}` : `${Number(day)} de ${monthName} de ${year}`
}

/** Só o ano, para listas e cartões. */
export function releaseYear(releaseDate: string): string {
  return releaseDate.slice(0, 4)
}

/** Nome do país em português a partir do código de duas letras ("GB" vira "Reino Unido"). */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames('pt-BR', { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** Data de uma avaliação, por extenso, no fuso do navegador: "10 de novembro de 2026". */
export function formatReviewDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Um disco só recebe nota depois de lançado (a API confere de novo). Data parcial vale como o 1º dia. */
export function isReleased(releaseDate: string, now: Date = new Date()): boolean {
  const [year, month = '01', day = '01'] = releaseDate.split('-')
  return `${year}-${month}-${day}` <= now.toISOString().slice(0, 10)
}

/** "2027-03-15" vira "15/03/2027". Feita à mão, sem Date, para o fuso nunca deslocar o dia. */
export function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

/** Hoje no Brasil ("AAAA-MM-DD"), e não no fuso do navegador: a agenda do site vale para o horário de Brasília. */
export function todayInBrazil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
