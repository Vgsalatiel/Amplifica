/** Contraste mínimo de texto normal sobre fundo branco (WCAG AA). */
export const MIN_CONTRAST = 4.5

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

/** Contraste de uma cor #RRGGBB contra o branco, de 1 (nenhum) a 21 (preto). */
export function contrastWithWhite(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return 1.05 / (luminance + 0.05)
}
