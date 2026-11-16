import { describe, expect, it } from 'vitest'
import { countryName, formatReleaseDate, releaseYear, monthHeading, showDay } from './format-date'

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

describe('showDay', () => {
  it('separa o dia, o dia da semana, o mês e o ano', () => {
    expect(showDay('2027-03-15')).toEqual({ day: '15', weekday: 'seg', month: 'março', year: '2027' })
    expect(showDay('2027-01-10')).toEqual({ day: '10', weekday: 'dom', month: 'janeiro', year: '2027' })
    expect(showDay('2027-02-20')).toEqual({ day: '20', weekday: 'sáb', month: 'fevereiro', year: '2027' })
  })

  it('tira o zero à esquerda do dia', () => {
    expect(showDay('2027-09-05').day).toBe('5')
  })

  it('acerta o dia da semana de datas em que o fuso poderia atrapalhar', () => {
    // 1º de janeiro de 2027 é sexta-feira, qualquer que seja o fuso do computador.
    expect(showDay('2027-01-01').weekday).toBe('sex')
    expect(showDay('2028-02-29').weekday).toBe('ter')
  })
})

describe('monthHeading', () => {
  it('escreve o mês por extenso com o ano', () => {
    expect(monthHeading('2027-03-15')).toBe('março de 2027')
    expect(monthHeading('2026-12-31')).toBe('dezembro de 2026')
  })
})
