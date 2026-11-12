import { describe, expect, it } from 'vitest'
import { countryName, formatReleaseDate, releaseYear } from './format-date'

describe('formatReleaseDate', () => {
  it('mostra só a parte conhecida da data', () => {
    expect(formatReleaseDate('2013', 'YEAR')).toBe('2013')
    expect(formatReleaseDate('2013-03', 'MONTH')).toBe('março de 2013')
    expect(formatReleaseDate('2013-03-29', 'DAY')).toBe('29 de março de 2013')
  })

  it('não coloca zero à esquerda no dia nem desloca a data por fuso', () => {
    expect(formatReleaseDate('2010-10-04', 'DAY')).toBe('4 de outubro de 2010')
    expect(formatReleaseDate('2024-01-01', 'DAY')).toBe('1 de janeiro de 2024')
  })
})

describe('releaseYear', () => {
  it('devolve o ano de qualquer precisão', () => {
    expect(releaseYear('2013-03-29')).toBe('2013')
    expect(releaseYear('2009')).toBe('2009')
  })
})

describe('countryName', () => {
  it('traduz o código para o nome em português', () => {
    expect(countryName('GB')).toBe('Reino Unido')
    expect(countryName('br')).toBe('Brasil')
  })
})
