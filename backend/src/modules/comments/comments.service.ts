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
import { isUniqueViolation } from '../../common/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImagesService, type ImageSet } from '../images/images.service.js';
import { MailService } from '../mail/mail.service.js';
import { needsEmailVerification, type AuthUser } from '../users/user.types.js';
import type {
  CreateCommentDto,
  ListCommentsQuery,
  ReportCommentDto,
} from './comments.schemas.js';

/** Comentários por pessoa em 24 horas. Moderadores e administradores não têm teto. */
export const DAILY_COMMENT_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const SHOW_NOT_FOUND = apiError('show_not_found', 'Esse show não existe.');
const COMMENT_NOT_FOUND = apiError(
  'comment_not_found',
  'Esse comentário não existe.',
);

const authorSelect = {
  username: true,
  displayName: true,
  avatarPath: true,
} as const;

export interface CommentResponse {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatar: ImageSet | null };
}

/** Um comentário denunciado, como a fila de moderação o vê. */
export interface ReportedCommentResponse extends CommentResponse {
  show: { slug: string; name: string | null; acts: string[] };
  reportCount: number;
  reasons: string[];
}

interface CommentRow {
  id: string;
  body: string;
  createdAt: Date;
  user: { username: string; displayName: string; avatarPath: string | null };
}

const isModerator = (user: AuthUser) =>
  user.role === 'ADMIN' || user.role === 'MODERATOR';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly images: ImagesService,
  ) {}

  private toResponse(row: CommentRow): CommentResponse {
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        username: row.user.username,
        displayName: row.user.displayName,
        avatar: this.images.toSet(row.user.avatarPath),
      },
    };
  }

  private requireVerified(user: AuthUser, action: string) {
    if (needsEmailVerification(user, this.mail.canDeliver)) {
      throw new ForbiddenException(
        apiError(
          'email_not_verified',
          `Confirme seu e-mail para ${action}. Enviamos um link para a sua caixa de entrada.`,
        ),
      );
    }
  }

  /** O mural de um show: os mais novos primeiro. Público. */
  async list(slug: string, query: ListCommentsQuery) {
    const show = await this.prisma.show.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!show) {
      throw new NotFoundException(SHOW_NOT_FOUND);
    }
    const rows = await this.prisma.showComment.findMany({
      where: { showId: show.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      include: { user: { select: authorSelect } },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async create(
    user: AuthUser,
    slug: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    this.requireVerified(user, 'comentar');
    const show = await this.prisma.show.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!show) {
      throw new NotFoundException(SHOW_NOT_FOUND);
    }
    if (!isModerator(user)) {
      const recent = await this.prisma.showComment.count({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      });
      if (recent >= DAILY_COMMENT_LIMIT) {
        throw new HttpException(
          apiError(
            'comment_limit',
            `Você já comentou ${DAILY_COMMENT_LIMIT} vezes nas últimas 24 horas. Tente de novo mais tarde.`,
          ),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    const row = await this.prisma.showComment.create({
      data: { showId: show.id, userId: user.id, body: dto.body },
      include: { user: { select: authorSelect } },
    });
    return this.toResponse(row);
  }

  /** Quem escreveu apaga o próprio comentário; moderadores apagam qualquer um. */
  async remove(user: AuthUser, id: string): Promise<void> {
    const comment = await this.prisma.showComment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!comment) {
      throw new NotFoundException(COMMENT_NOT_FOUND);
    }
    if (comment.userId !== user.id && !isModerator(user)) {
      throw new ForbiddenException(
        apiError('forbidden', 'Você não pode apagar esse comentário.'),
      );
    }
    await this.prisma.showComment.deleteMany({ where: { id } });
  }

  async report(
    user: AuthUser,
    id: string,
    dto: ReportCommentDto,
  ): Promise<void> {
    this.requireVerified(user, 'denunciar');
    const comment = await this.prisma.showComment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!comment) {
      throw new NotFoundException(COMMENT_NOT_FOUND);
    }
    if (comment.userId === user.id) {
      throw new BadRequestException(
        apiError(
          'own_comment',
          'Esse comentário é seu. Se quiser, apague-o.',
        ),
      );
    }
    try {
      await this.prisma.commentReport.create({
        data: { commentId: id, reporterId: user.id, reason: dto.reason },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          apiError('already_reported', 'Você já denunciou esse comentário.'),
        );
      }
      throw error;
    }
  }

  /** A fila: comentários com denúncia ainda não vista, os mais denunciados primeiro. */
  async listReported(): Promise<ReportedCommentResponse[]> {
    const rows = await this.prisma.showComment.findMany({
      where: { reports: { some: { resolvedAt: null } } },
      include: {
        user: { select: authorSelect },
        show: {
          select: {
            slug: true,
            name: true,
            acts: { orderBy: { position: 'asc' }, select: { name: true } },
          },
        },
        reports: {
          where: { resolvedAt: null },
          select: { reason: true },
        },
      },
      take: 100,
    });
    return rows
      .map((row) => ({
        ...this.toResponse(row),
        show: {
          slug: row.show.slug,
          name: row.show.name,
          acts: row.show.acts.map((act) => act.name),
        },
        reportCount: row.reports.length,
        reasons: row.reports
          .map((report) => report.reason)
          .filter((reason): reason is string => reason !== null),
      }))
      .sort(
        (a, b) =>
          b.reportCount - a.reportCount || b.createdAt.localeCompare(a.createdAt),
      );
  }

  /** "Manter": o moderador viu e o comentário fica. As denúncias saem da fila. */
  async dismissReports(id: string): Promise<void> {
    const found = await this.prisma.showComment.count({ where: { id } });
    if (found === 0) {
      throw new NotFoundException(COMMENT_NOT_FOUND);
    }
    await this.prisma.commentReport.updateMany({
      where: { commentId: id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
  }
}
