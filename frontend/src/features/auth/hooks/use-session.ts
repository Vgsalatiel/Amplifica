import { useSyncExternalStore } from 'react'
import { sessionStore, type SessionState } from '../../../lib/session'

/** Estado da sessão: carregando, visitante ou autenticado (com o usuário). */
export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState)
}
