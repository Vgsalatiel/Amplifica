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
