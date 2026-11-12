import type { Role, User } from '../../generated/prisma/client.js';

/** O usuário autenticado, como as rotas o recebem em `@CurrentUser()`. Sem o hash da senha. */
export type AuthUser = Omit<User, 'passwordHash'>;

/** O que o próprio usuário vê sobre a sua conta. */
export interface PrivateUserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  role: Role;
  createdAt: string;
}

/** O que qualquer visitante vê em um perfil. Nunca inclui e-mail. */
export interface PublicUserResponse {
  username: string;
  displayName: string;
  bio: string | null;
  createdAt: string;
}

export function toPrivateUser(user: AuthUser): PrivateUserResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPublicUser(user: AuthUser): PublicUserResponse {
  return {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

// Informa ao @nestjs/authentication qual é o tipo do usuário da aplicação,
// para que `@CurrentUser()` seja tipado em todas as rotas.
declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AuthUser;
  }
}
