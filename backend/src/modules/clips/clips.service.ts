import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import {
  isForeignKeyViolation,
  isNotFound,
  isUniqueViolation,
} from '../../common/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { needsEmailVerification, type AuthUser } from '../users/user.types.js';
import {
  clipInclude,
  toClipResponse,
  toMyClipResponse,
  toReviewClipResponse,
  type ClipResponse,
  type MyClipResponse,
  type ReviewClipResponse,
} from './clips.mappers.js';
import type {
  ListClipsQuery,
  ReviewClipDto,
  ReviewListQuery,
  SuggestClipDto,
} from './clips.schemas.js';
import { parseYouTubeId } from './youtube.js';
import { VideoNotUsableError, YouTubeOEmbed } from './youtube-oembed.js';

/** Sugestões por pessoa em 24 horas, contando as pendentes e as recusadas. Administradores não têm teto. */
/** Os clipes que uma pessoa descobriu: o total e os mais recentes. */
export interface DiscoveriesResponse {
  count: number;
  items: ClipResponse[];
}

export const DAILY_SUGGESTION_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const NOT_FOUND = apiError('clip_not_found', 'Esse clipe não existe.');

/** Playlist "Agora na tela": os clipes fixos primeiro e, depois, as sugestões aprovadas. */
@Injectable()
export class ClipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly oembed: YouTubeOEmbed,
  ) {}

  /**
   * Os aprovados: fixos primeiro, na ordem de `position`; depois as sugestões, da última aprovada
   * para a mais antiga. Quem manda é a hora da aprovação, não a do pedido: o clipe que acabou de
   * entrar é sempre o próximo depois dos fixos.
   */
  async list(query: ListClipsQuery): Promise<ClipResponse[]> {
    const clips = await this.prisma.clip.findMany({
      where: { status: 'APPROVED' },
      include: clipInclude,
      orderBy: [
        { pinned: 'desc' },
        { position: 'asc' },
        { reviewedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: query.limit,
    });
    return clips.map(toClipResponse);
  }

  /** Os clipes aprovados que a pessoa sugeriu: o que ela "descobriu". Público, para o perfil. */
  async listDiscoveries(username: string): Promise<DiscoveriesResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(
        apiError('user_not_found', 'Não existe um perfil com esse nome.'),
      );
    }
    const where = {
      submittedById: user.id,
      status: 'APPROVED' as const,
      pinned: false,
    };
    const [count, clips] = await Promise.all([
      this.prisma.clip.count({ where }),
      this.prisma.clip.findMany({
        where,
        include: clipInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
      }),
    ]);
    return { count, items: clips.map(toClipResponse) };
  }

  /** As sugestões de quem está logado, com a situação de cada uma. */
  async listMine(user: AuthUser): Promise<MyClipResponse[]> {
    const clips = await this.prisma.clip.findMany({
      where: { submittedById: user.id },
      include: clipInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });
    return clips.map(toMyClipResponse);
  }

  /**
   * Sugere um clipe. Fica pendente até um administrador aprovar; a sugestão de um administrador já
   * entra aprovada. O vídeo é conferido no YouTube antes de gravar.
   */
  async suggest(user: AuthUser, dto: SuggestClipDto): Promise<MyClipResponse> {
    if (needsEmailVerification(user, this.mail.canDeliver)) {
      throw new ForbiddenException(
        apiError(
          'email_not_verified',
          'Confirme seu e-mail para sugerir clipes. Enviamos um link para a sua caixa de entrada.',
        ),
      );
    }

    const youtubeId = parseYouTubeId(dto.url);
    if (!youtubeId) {
      throw new BadRequestException(
        apiError(
          'invalid_clip_link',
          'Cole o link de um vídeo do YouTube, como https://www.youtube.com/watch?v=…',
          [
            {
              field: 'url',
              message: 'Esse não é um link de vídeo do YouTube.',
            },
          ],
        ),
      );
    }

    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin) {
      const recent = await this.prisma.clip.count({
        where: {
          submittedById: user.id,
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      });
      if (recent >= DAILY_SUGGESTION_LIMIT) {
        throw new HttpException(
          apiError(
            'clip_limit_reached',
            `Você já sugeriu ${DAILY_SUGGESTION_LIMIT} clipes nas últimas 24 horas. Tente de novo amanhã.`,
          ),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    if (await this.prisma.clip.findUnique({ where: { youtubeId } })) {
      throw new ConflictException(ALREADY_SUGGESTED);
    }

    let info;
    try {
      info = await this.oembed.lookup(youtubeId);
    } catch (error) {
      if (error instanceof VideoNotUsableError) {
        throw new BadRequestException(
          apiError(
            'clip_unavailable',
            'Esse vídeo não existe, é privado ou o dono não deixa incorporá-lo em outros sites.',
            [
              {
                field: 'url',
                message: 'Esse vídeo não pode entrar na playlist.',
              },
            ],
          ),
        );
      }
      throw new ServiceUnavailableException(
        apiError(
          'clip_check_failed',
          'Não foi possível conferir o vídeo no YouTube agora. Tente de novo em instantes.',
        ),
      );
    }

    try {
      const clip = await this.prisma.clip.create({
        data: {
          youtubeId,
          title: info.title,
          channelName: info.channelName,
          status: isAdmin ? 'APPROVED' : 'PENDING',
          reviewedAt: isAdmin ? new Date() : null,
          submittedById: user.id,
        },
        include: clipInclude,
      });
      return toMyClipResponse(clip);
    } catch (error) {
      // Duas sugestões do mesmo vídeo ao mesmo tempo: o índice único barra a segunda.
      if (isUniqueViolation(error)) {
        throw new ConflictException(ALREADY_SUGGESTED);
      }
      throw error;
    }
  }

  /** Fila de moderação: as sugestões em uma situação (pendentes por padrão), das mais antigas às mais novas. */
  async listForReview(query: ReviewListQuery): Promise<ReviewClipResponse[]> {
    const clips = await this.prisma.clip.findMany({
      where: { status: query.status },
      include: clipInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    return clips.map(toReviewClipResponse);
  }

  async review(id: string, dto: ReviewClipDto): Promise<ReviewClipResponse> {
    try {
      const clip = await this.prisma.clip.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedAt: new Date(),
          ...(dto.artistId !== undefined && { artistId: dto.artistId }),
        },
        include: clipInclude,
      });
      return toReviewClipResponse(clip);
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException(NOT_FOUND);
      }
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(
          apiError('artist_not_found', 'Essa banda não existe no catálogo.', [
            {
              field: 'artistId',
              message: 'Essa banda não existe no catálogo.',
            },
          ]),
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.clip.delete({ where: { id } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException(NOT_FOUND);
      }
      throw error;
    }
  }
}

const ALREADY_SUGGESTED = apiError(
  'clip_already_suggested',
  'Esse clipe já foi sugerido.',
  [{ field: 'url', message: 'Esse clipe já foi sugerido.' }],
);
