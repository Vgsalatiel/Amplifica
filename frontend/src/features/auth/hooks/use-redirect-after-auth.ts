import { useLocation } from 'react-router'

/**
 * A página interna de onde a pessoa veio (uma rota protegida, ou um disco de onde ela
 * clicou em "Criar conta"), ou `null` se não veio de nenhuma.
 */
export function useRedirectFrom(): string | null {
  const location = useLocation()
  const from = (location.state as { from?: unknown } | null)?.from
  // Só caminhos internos: evita que um link malicioso mande o usuário para outro site.
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}

/** Para onde ir depois de entrar: a página de onde a pessoa veio, ou o início. */
export function useRedirectTarget(): string {
  return useRedirectFrom() ?? '/'
}
