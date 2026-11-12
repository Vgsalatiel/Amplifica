import { describe, expect, it } from 'vitest'
import { formatDuration, formatTotalDuration, parseDuration } from './duration'

describe('parseDuration', () => {
  it.each([
    ['3:45', 225_000],
    ['0:30', 30_000],
    ['12:05', 725_000],
    ['1:02:03', 3_723_000],
    [' 4:00 ', 240_000],
  ])('lê "%s"', (text, ms) => {
    expect(parseDuration(text)).toEqual({ ok: true, ms })
  })

  it('vazio significa sem duração', () => {
    expect(parseDuration('')).toEqual({ ok: true, ms: null })
  })

  it.each(['abc', '3', '3:7:7:7', '3:60', '1:75:00', '0:00', '2:00:01', '-1:30', '3:4x'])(
    'recusa "%s"',
    (text) => {
      expect(parseDuration(text)).toEqual({ ok: false })
    },
  )
})

describe('formatDuration', () => {
  it('formata minutos e segundos, e horas quando passa de uma', () => {
    expect(formatDuration(207_000)).toBe('3:27')
    expect(formatDuration(5_000)).toBe('0:05')
    expect(formatDuration(3_723_000)).toBe('1:02:03')
  })

  it('ida e volta preserva o texto', () => {
    for (const text of ['3:27', '10:00', '1:02:03']) {
      const parsed = parseDuration(text)
      expect(parsed.ok && parsed.ms !== null && formatDuration(parsed.ms)).toBe(text)
    }
  })
})

describe('formatTotalDuration', () => {
  it('mostra minutos, e horas quando passa de uma', () => {
    expect(formatTotalDuration(3_480_000)).toBe('58 min')
    expect(formatTotalDuration(8_940_000)).toBe('2 h 29 min')
    expect(formatTotalDuration(7_200_000)).toBe('2 h')
    expect(formatTotalDuration(10_000)).toBe('1 min')
  })
})
