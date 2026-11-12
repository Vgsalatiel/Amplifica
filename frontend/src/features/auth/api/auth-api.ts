import { httpRequest } from '../../../lib/http'
import { endSession, startSession } from '../../../lib/session'
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
