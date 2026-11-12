import type { SessionResponse, User } from '../types/api'
import { ApiError, httpRequest } from './http'

/**
 * Estado da sessão do usuário, fora do React.
 *
 * O token de acesso fica apenas nesta variável: não vai para localStorage nem para
 * cookie legível, então um script injetado na página não consegue copiá-lo. Ao
 * recarregar a página ele se perde, e a sessão é recuperada pelo cookie de renovação
 * (HttpOnly), que só o servidor lê.
 */
export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }

let state: SessionState = { status: 'loading' }
let accessToken: string | null = null
const listeners = new Set<() => void>()

function setState(next: SessionState): void {
  state = next
  for (const listener of listeners) {
    listener()
  }
}

/** Interface para o hook useSession (useSyncExternalStore). */
export const sessionStore = {
  getState: (): SessionState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function getAccessToken(): string | null {
  return accessToken
}

export function startSession(session: SessionResponse): void {
  accessToken = session.accessToken
  setState({ status: 'authenticated', user: session.user })
}

export function endSession(): void {
  accessToken = null
  setState({ status: 'anonymous' })
}

/** Atualiza os dados do usuário logado depois de uma edição de perfil. */
export function updateSessionUser(user: User): void {
  if (state.status === 'authenticated') {
    setState({ status: 'authenticated', user })
  }
}

let pendingRefresh: Promise<SessionResponse | null> | null = null

/**
 * Pede uma sessão nova ao servidor usando o cookie de renovação. Devolve `null`
 * quando não há sessão válida.
 *
 * Cada token de renovação só pode ser usado uma vez, e reapresentá-lo encerra a
 * sessão. Por isso garantimos uma única chamada por vez: dentro desta aba, com a
 * promessa compartilhada; entre abas, com a Web Locks API.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  pendingRefresh ??= runExclusive(requestRefresh).finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

async function requestRefresh(): Promise<SessionResponse | null> {
  try {
    const session = await httpRequest<SessionResponse>('/auth/refresh', { method: 'POST' })
    startSession(session)
    return session
  } catch (error) {
    // 401: não há sessão. Outros erros (rede, servidor fora do ar): não dá para
    // confirmar a sessão agora, então a interface segue como visitante.
    if (!(error instanceof ApiError) || error.status === 401 || state.status === 'loading') {
      endSession()
    }
    return null
  }
}

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('amplifica-session-refresh', task) as Promise<T>
  }
  return task()
}

/** Só para testes: volta ao estado inicial. */
export function resetSessionForTests(): void {
  accessToken = null
  pendingRefresh = null
  state = { status: 'loading' }
}
