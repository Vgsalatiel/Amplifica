import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import type { Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { needsEmailVerification } from '../users/user.types.js';
import type { SetRoleDto } from './team.schemas.js';

export interface TeamMember {
  username: string;
  displayName: string;
  role: Role;
}

const select = {
  username: true,
  displayName: true,
  role: true,
  emailVerifiedAt: true,
} as const;

/** A equipe do site: administradores e moderadores. Só administradores a consultam e alteram. */
@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Administradores primeiro, depois moderadores, cada grupo por nome de usuário. */
  async list(): Promise<TeamMember[]> {
    const members = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MODERATOR'] } },
      select,
      orderBy: { username: 'asc' },
    });
    // A ordem dos papéis no banco é a de criação (o moderador veio depois do administrador), então
    // os administradores são postos na frente aqui, sem depender dela.
    return members
      .map(toMember)
      .sort(
        (a, b) =>
          Number(b.role === 'ADMIN') - Number(a.role === 'ADMIN') ||
          a.username.localeCompare(b.username),
      );
  }

  /**
   * Promove alguém a moderador ou devolve o papel de usuário comum. O papel de um administrador não
   * muda por aqui, e quem vira moderador precisa ter o e-mail confirmado (quando o site consegue
   * enviar e-mails), porque passa a decidir sobre o conteúdo dos outros.
   */
  async setRole(username: string, dto: SetRoleDto): Promise<TeamMember> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select,
    });
    if (!user) {
      throw new NotFoundException(
        apiError(
          'user_not_found',
          'Não existe uma conta com esse nome de usuário.',
        ),
      );
    }
    if (user.role === 'ADMIN') {
      throw new ForbiddenException(
        apiError(
          'admin_role_locked',
          'O papel de um administrador não muda por aqui.',
        ),
      );
    }
    if (
      dto.role === 'MODERATOR' &&
      needsEmailVerification(user, this.mail.canDeliver)
    ) {
      throw new ConflictException(
        apiError(
          'email_not_verified',
          'Essa pessoa ainda não confirmou o e-mail. Só quem confirmou pode ser moderador.',
        ),
      );
    }

    const updated = await this.prisma.user.update({
      where: { username },
      data: { role: dto.role },
      select,
    });
    return toMember(updated);
  }
}

function toMember(user: {
  username: string;
  displayName: string;
  role: Role;
}): TeamMember {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}
