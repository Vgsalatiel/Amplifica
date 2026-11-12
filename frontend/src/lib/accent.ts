import type { CSSProperties } from 'react'
import { isHexColor } from './color'

/**
 * Tema de uma página pela cor do disco. As cores do site são variáveis CSS (`--color-accent`
 * e `--color-accent-hover`); redefini-las em um elemento muda botões, notas e links de tudo
 * que está dentro dele, sem tocar em nenhum componente. Fora desse elemento o site continua
 * no violeta padrão. A cor já chega da API com contraste suficiente sobre branco.
 */
export function accentStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color || !isHexColor(color)) {
    return undefined
  }
  return {
    '--color-accent': color,
    // O realce (passar o mouse) é a mesma cor, mais escura.
    '--color-accent-hover': `color-mix(in oklab, ${color} 78%, black)`,
  } as CSSProperties
}
