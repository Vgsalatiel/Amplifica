import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { isNotFound, isUniqueViolation } from '../../common/prisma-errors.js';
import type {
  GroupPlatform,
  GroupStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { todayInBrazil } from '../shows/show-date.js';
import { needsEmailVerification, type AuthUser } from '../users/user.types.js';
import { parseGroupLink } from './group-link.js';
import type {
  ReviewGroupDto,
  ReviewListQuery,
  SuggestGroupDto,
} from './groups.schemas.js';

/** Sugestões por pessoa em 24 horas. Moderadores e administradores não têm teto. */
export const DAILY_GROUP_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const SHOW_NOT_FOUND = apiError('show_not_found', 'Esse show não existe.');
const GROUP_NOT_FOUND = apiError('group_not_found', 'Esse grupo não existe.');

/** O que qualquer visitante vê: só os aprovados. */
export interface GroupResponse {
  id: string;
  platform: GroupPlatform;
  url: string;
}

/** Uma linha da fila de moderação. */
export interface ReviewGroupResponse extends GroupResponse {
  status: GroupStatus;
  createdAt: string;
  reviewedAt: string | null;
  show: { slug: string; name: string | null; acts: string[] };
  suggestedBy: { username: string } | null;
}

/** A sugestão de quem enviou. */
export interface MyGroupResponse extends GroupResponse {
  status: GroupStatus;
}

const isModerator = (user: AuthUser) =>
  user.role === 'ADMIN' || user.role === 'MODERATOR';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async list(slug: string): Promise<GroupResponse[]> {
    const show = await this.prisma.show.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!show) {
      throw new NotFoundException(SHOW_NOT_FOUND);
    }
    const rows = await this.prisma.showGroup.findMany({
      where: { showId: show.id, status: 'APPROVED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, platform: true, url: true },
    });
    return rows;
  }

  /**
   * Sugere o link de um grupo. Fica pendente até um moderador aprovar; a sugestão de um moderador
   * ou administrador já entra aprovada.
   */
  async suggest(
    user: AuthUser,
    slug: string,
    dto: SuggestGroupDto,
  ): Promise<MyGroupResponse> {
    if (needsEmailVerification(user, this.mail.canDeliver)) {
      throw new ForbiddenException(
        apiError(
          'email_not_verified',
          'Confirme seu e-mail para sugerir um grupo. Enviamos um link para a sua caixa de entrada.',
        ),
      );
    }
    const link = parseGroupLink(dto.url);
    if (!link) {
      throw new BadRequestException(
        apiError(
          'invalid_group_link',
          'Use o link de convite de um grupo do WhatsApp, Telegram ou Discord.',
          [
            {
              field: 'url',
              message:
                'Esse não é um link de convite do WhatsApp, Telegram ou Discord.',
            },
          ],
        ),
      );
    }
    const show = await this.prisma.show.findUnique({
      where: { slug },
      select: { id: true, date: true, status: true },
    });
    if (!show) {
      throw new NotFoundException(SHOW_NOT_FOUND);
    }
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

    const trusted = isModerator(user);
    if (!trusted) {
      const recent = await this.prisma.showGroup.count({
        where: {
          submittedById: user.id,
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      });
      if (recent >= DAILY_GROUP_LIMIT) {
        throw new HttpException(
          apiError(
            'group_limit_reached',
            `Você já sugeriu ${DAILY_GROUP_LIMIT} grupos nas últimas 24 horas. Tente de novo amanhã.`,
          ),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    try {
      const row = await this.prisma.showGroup.create({
        data: {
          showId: show.id,
          platform: link.platform,
          url: link.url,
          status: trusted ? 'APPROVED' : 'PENDING',
          reviewedAt: trusted ? new Date() : null,
          submittedById: user.id,
        },
        select: { id: true, platform: true, url: true, status: true },
      });
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          apiError(
            'group_already_suggested',
            'Esse grupo já foi sugerido para este show.',
          ),
        );
      }
      throw error;
    }
  }

  async listForReview(query: ReviewListQuery): Promise<ReviewGroupResponse[]> {
    const rows = await this.prisma.showGroup.findMany({
      where: { status: query.status },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
      include: {
        submittedBy: { select: { username: true } },
        show: {
          select: {
            slug: true,
            name: true,
            acts: { orderBy: { position: 'asc' }, select: { name: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      platform: row.platform,
      url: row.url,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      show: {
        slug: row.show.slug,
        name: row.show.name,
        acts: row.show.acts.map((act) => act.name),
      },
      suggestedBy: row.submittedBy,
    }));
  }

  async review(id: string, dto: ReviewGroupDto): Promise<void> {
    try {
      await this.prisma.showGroup.update({
        where: { id },
        data: { status: dto.status, reviewedAt: new Date() },
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException(GROUP_NOT_FOUND);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.showGroup.delete({ where: { id } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException(GROUP_NOT_FOUND);
      }
      throw error;
    }
  }
}
