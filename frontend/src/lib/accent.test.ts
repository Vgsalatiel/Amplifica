import { describe, expect, it } from 'vitest'
import { accentStyle } from './accent'

describe('accentStyle', () => {
  it('redefine a cor de destaque e a do realce', () => {
    const style = accentStyle('#D8281D') as Record<string, string>

    expect(style['--color-accent']).toBe('#D8281D')
    expect(style['--color-accent-hover']).toContain('#D8281D')
  })

  it.each([null, undefined, '', 'vermelho', '#FFF', 'url(javascript:alert(1))'])(
    'não aplica nada para %s',
    (value) => {
      expect(accentStyle(value)).toBeUndefined()
    },
  )
})
