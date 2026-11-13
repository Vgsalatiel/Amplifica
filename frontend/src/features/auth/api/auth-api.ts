import { apiFetch } from '../../../lib/api-client'
import { httpRequest } from '../../../lib/http'
import { endSession, startSession, updateSessionUser } from '../../../lib/session'
import type { SessionResponse, User } from '../../../types/api'

export interface RegisterInput {
  email: string
  username: string
  password: string
  displayName?: string
}

export interface LoginInput {
  email: string
  password: string
}

// Estas rotas usam httpRequest direto: são públicas, e um 401 aqui significa
// "credenciais erradas", não "token vencido".

export async function register(input: RegisterInput): Promise<User> {
  const session = await httpRequest<SessionResponse>('/auth/register', { method: 'POST', json: input })
  startSession(session)
  return session.user
}

export async function login(input: LoginInput): Promise<User> {
  const session = await httpRequest<SessionResponse>('/auth/login', { method: 'POST', json: input })
  startSession(session)
  return session.user
}

export async function logout(): Promise<void> {
  try {
    await httpRequest<void>('/auth/logout', { method: 'POST' })
  } finally {
    // Mesmo que a chamada falhe, este navegador deixa de tratar o usuário como logado.
    endSession()
  }
}

// Confirmação de e-mail e redefinição de senha. As três primeiras são públicas (quem abre o link
// pode nem estar logado); reenviar a confirmação exige a sessão.

export const verifyEmail = (token: string) =>
  httpRequest<void>('/auth/verify-email', { method: 'POST', json: { token } })

export const forgotPassword = (email: string) =>
  httpRequest<void>('/auth/forgot-password', { method: 'POST', json: { email } })

export const resetPassword = (token: string, password: string) =>
  httpRequest<void>('/auth/reset-password', { method: 'POST', json: { token, password } })

export const resendVerification = () => apiFetch<void>('/auth/resend-verification', { method: 'POST' })

/** Relê a própria conta (por exemplo, depois de confirmar o e-mail) e atualiza a sessão. */
export async function refreshCurrentUser(): Promise<void> {
  updateSessionUser(await apiFetch<User>('/auth/me'))
}
