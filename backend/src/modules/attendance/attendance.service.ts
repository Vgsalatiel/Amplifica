import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImagesService, type ImageSet } from '../images/images.service.js';
import { MailService } from '../mail/mail.service.js';
import { todayInBrazil } from '../shows/show-date.js';
import { needsEmailVerification, type AuthUser } from '../users/user.types.js';
import type { SetAttendanceDto } from './attendance.schemas.js';

/** Quantos nomes a lista pública traz. O total vem sempre inteiro, em `count`. */
const NAMES_LIMIT = 50;

export interface AttendanceSummary {
  /** Todas as pessoas que vão, inclusive as que não mostram o nome. */
  count: number;
  /** Só quem marcou "mostrar meu nome". */
  going: Array<{
    username: string;
    displayName: string;
    avatar: ImageSet | null;
  }>;
}

export interface MyAttendance {
  going: boolean;
  showName: boolean;
}

const NOT_FOUND = apiError('show_not_found', 'Esse show não existe.');

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly images: ImagesService,
  ) {}

  private async findShow(slug: string) {
    const show = await this.prisma.show.findUnique({
      where: { slug },
      select: { id: true, date: true, status: true },
    });
    if (!show) {
      throw new NotFoundException(NOT_FOUND);
    }
    return show;
  }

  /** Quantas pessoas vão e quais mostram o nome. Pública. */
  async summary(slug: string): Promise<AttendanceSummary> {
    const show = await this.findShow(slug);
    const [count, visible] = await Promise.all([
      this.prisma.showAttendance.count({ where: { showId: show.id } }),
      this.prisma.showAttendance.findMany({
        where: { showId: show.id, showName: true },
        orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
        take: NAMES_LIMIT,
        select: {
          user: {
            select: { username: true, displayName: true, avatarPath: true },
          },
        },
      }),
    ]);
    return {
      count,
      going: visible.map(({ user }) => ({
        username: user.username,
        displayName: user.displayName,
        avatar: this.images.toSet(user.avatarPath),
      })),
    };
  }

  async mine(user: AuthUser, slug: string): Promise<MyAttendance> {
    const show = await this.findShow(slug);
    const row = await this.prisma.showAttendance.findUnique({
      where: { userId_showId: { userId: user.id, showId: show.id } },
    });
    return { going: row !== null, showName: row?.showName ?? false };
  }

  /** "Eu vou": cria a presença ou só muda a escolha de mostrar o nome. */
  async set(
    user: AuthUser,
    slug: string,
    dto: SetAttendanceDto,
  ): Promise<MyAttendance> {
    if (needsEmailVerification(user, this.mail.canDeliver)) {
      throw new ForbiddenException(
        apiError(
          'email_not_verified',
          'Confirme seu e-mail para marcar presença. Enviamos um link para a sua caixa de entrada.',
        ),
      );
    }
    const show = await this.findShow(slug);
    if (show.status === 'CANCELLED') {
      throw new BadRequestException(
        apiError('show_cancelled', 'Esse show foi cancelado.'),
      );
    }
    if (show.date < todayInBrazil()) {
      throw new BadRequestException(
        apiError('show_past', 'Esse show já aconteceu.'),
      );
    }
    const row = await this.prisma.showAttendance.upsert({
      where: { userId_showId: { userId: user.id, showId: show.id } },
      create: { userId: user.id, showId: show.id, showName: dto.showName },
      update: { showName: dto.showName },
    });
    return { going: true, showName: row.showName };
  }

  /** Desmarca a presença. Sem erro se a pessoa já não estava na lista. */
  async remove(user: AuthUser, slug: string): Promise<void> {
    const show = await this.findShow(slug);
    await this.prisma.showAttendance.deleteMany({
      where: { userId: user.id, showId: show.id },
    });
  }
}
