import { Injectable, NotFoundException } from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { ImagesService } from '../images/images.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from './user.types.js';
import type { UpdateProfileDto } from './users.schemas.js';

/** Campos carregados do banco: tudo, menos o hash da senha. */
export const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarPath: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  findById(id: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  async getByUsername(username: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException(
        apiError('user_not_found', 'Não existe um perfil com esse nome.'),
      );
    }
    return user;
  }

  /**
   * Altera o perfil de `userId`. O id vem sempre do token de quem fez a requisição,
   * nunca do corpo ou da URL: é isso que garante que cada um só edita o próprio perfil.
   */
  updateProfile(userId: string, data: UpdateProfileDto): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async setAvatar(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<AuthUser> {
    const current = await this.findById(userId);
    const stored = await this.images.store('avatars', userId, file);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: stored.path },
      select: userSelect,
    });
    // A imagem antiga só é apagada depois que o banco já aponta para a nova.
    if (current?.avatarPath && current.avatarPath !== stored.path) {
      await this.images.remove(current.avatarPath);
    }
    return user;
  }

  async removeAvatar(userId: string): Promise<AuthUser> {
    const current = await this.findById(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: null },
      select: userSelect,
    });
    await this.images.remove(current?.avatarPath);
    return user;
  }
}
