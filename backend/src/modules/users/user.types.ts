import type { Role, User } from '../../generated/prisma/client.js';
import type { ImageSet } from '../images/images.service.js';

/** O usuário autenticado, como as rotas o recebem em `@CurrentUser()`. Sem o hash da senha. */
export type AuthUser = Omit<User, 'passwordHash'>;

/** O que o próprio usuário vê sobre a sua conta. */
export interface PrivateUserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatar: ImageSet | null;
  role: Role;
  createdAt: string;
}

/** O que qualquer visitante vê em um perfil. Nunca inclui e-mail. */
export interface PublicUserResponse {
  username: string;
  displayName: string;
  bio: string | null;
  avatar: ImageSet | null;
  createdAt: string;
}

/** Os mappers recebem a função que transforma o caminho do avatar em URLs. */
type ToImageSet = (path: string | null) => ImageSet | null;

export function toPrivateUser(
  user: AuthUser,
  toImageSet: ToImageSet,
): PrivateUserResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatar: toImageSet(user.avatarPath),
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPublicUser(
  user: AuthUser,
  toImageSet: ToImageSet,
): PublicUserResponse {
  return {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatar: toImageSet(user.avatarPath),
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
