import type { ComponentType } from 'react'

/**
 * Carrega a página só quando a pessoa chega nela: o código de cada página vai num arquivo separado,
 * e a primeira visita baixa só o que a tela inicial precisa. Na troca de página, a tela atual fica até
 * a nova chegar, sem piscar.
 */
export function page<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T & string) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}
