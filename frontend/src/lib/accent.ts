import type { CSSProperties } from 'react'
import { isHexColor } from './color'

/**
 * Tema de uma página pela cor do disco. As cores do site são variáveis CSS (`--color-accent`
 * e `--color-accent-hover`); redefini-las em um elemento muda botões, notas e links de tudo
 * que está dentro dele, sem tocar em nenhum componente. Fora desse elemento o site continua
 * no rosa padrão.
 *
 * O site é preto, mas a cor do disco chega da API escura (com contraste sobre branco). Por isso ela
 * é clareada em direção ao branco (`onDark`): assim o texto, os links e o medidor de nota continuam
 * legíveis sobre o preto, e o texto sobre a cor (preto) continua legível também.
 */
export function onDark(color: string): string {
  return `color-mix(in oklab, ${color} 45%, white)`
}

export function accentStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color || !isHexColor(color)) {
    return undefined
  }
  return {
    '--color-accent': onDark(color),
    // O realce (passar o mouse) é a mesma cor, ainda mais clara.
    '--color-accent-hover': `color-mix(in oklab, ${color} 28%, white)`,
  } as CSSProperties
}
