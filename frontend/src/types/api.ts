/** Tipos das respostas da API. Espelham o que o backend devolve em /api/v1. */

export type Role = 'USER' | 'ADMIN'

/** A própria conta, como vem de /auth/me, login, cadastro e renovação. */
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  role: Role
  createdAt: string
}

/** Perfil público: o que qualquer visitante vê. */
export interface PublicUser {
  username: string
  displayName: string
  bio: string | null
  createdAt: string
}

export interface SessionResponse {
  accessToken: string
  expiresIn: number
  user: User
}

export interface ApiErrorDetail {
  field: string
  message: string
}
