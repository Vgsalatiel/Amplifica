import { useLocation } from 'react-router'

/** Para onde ir depois de entrar: a página protegida que o visitante tentou abrir, ou o início. */
export function useRedirectTarget(): string {
  const location = useLocation()
  const from = (location.state as { from?: unknown } | null)?.from
  // Só caminhos internos: evita que um link malicioso mande o usuário para outro site.
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}
