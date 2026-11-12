import { describe, expect, it } from 'vitest'
import { contrastWithWhite, isHexColor } from './color'

describe('contrastWithWhite', () => {
  it('mede o contraste contra o branco', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 0)
    expect(contrastWithWhite('#FFFFFF')).toBeCloseTo(1, 1)
    expect(contrastWithWhite('#5630D0')).toBeCloseTo(7.7, 1)
  })
})

describe('isHexColor', () => {
  it.each(['#5630D0', '#abcdef'])('aceita %s', (value) => expect(isHexColor(value)).toBe(true))
  it.each(['5630D0', '#fff', '#GGGGGG', ''])('recusa "%s"', (value) => expect(isHexColor(value)).toBe(false))
})
