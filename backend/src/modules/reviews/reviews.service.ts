import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '@nestjs/authorization';
import { apiError } from '../../common/api-error.js';
import {
  paginate,
  toSkipTake,
  type Paginated,
} from '../../common/pagination.js';
import { isUniqueViolation } from '../../common/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { releaseSummaryInclude } from '../catalog/catalog.mappers.js';
import { loadRatings, ratingOf } from '../catalog/ratings.js';
import { ImagesService } from '../images/images.service.js';
import type { AuthUser } from '../users/user.types.js';
import { isReleased } from './release-status.js';
import { ReviewPolicy } from './review.policy.js';
import {
  authorSelect,
  toReviewResponse,
  toUserReviewResponse,
  type ReviewResponse,
  type UserReviewResponse,
} from './reviews.mappers.js';
import type { ListReviewsQuery, UpsertReviewDto } from './reviews.schemas.js';

const RELEASE_NOT_FOUND = apiError(
  'release_not_found',
  'Esse lançamento não existe.',
);
const REVIEW_NOT_FOUND = apiError(
  'review_not_found',
  'Essa avaliação não existe.',
);

/** Avaliações de discos: uma por pessoa e por disco. */
@Injectable()
export class ReviewsService {
  private readonly toImageSet: ImagesService['toSet'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    images: ImagesService,
  ) {
    this.toImageSet = (path) => images.toSet(path);
  }

  /**
   * Resenhas de um disco, da mais recente para a mais antiga. Só entram as que têm texto:
   * notas sem texto contam na média, mas não ocupam a lista.
   */
  async list(
    slug: string,
    query: ListReviewsQuery,
  ): Promise<Paginated<ReviewResponse>> {
    const release = await this.findRelease(slug);
    const where = { releaseId: release.id, body: { not: null } };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { user: { select: authorSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...toSkipTake(query),
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(
      reviews.map((review) => toReviewResponse(review, this.toImageSet)),
      total,
      query,
    );
  }

  /** Todas as avaliações de uma pessoa (com ou sem texto), para o perfil dela. */
  async listByUser(
    username: string,
    query: ListReviewsQuery,
  ): Promise<Paginated<UserReviewResponse>> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(
        apiError('user_not_found', 'Não existe um perfil com esse nome.'),
      );
    }

    const where = { userId: user.id };
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { release: { include: releaseSummaryInclude } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...toSkipTake(query),
      }),
      this.prisma.review.count({ where }),
    ]);

    const ratings = await loadRatings(
      this.prisma,
      reviews.map((review) => review.releaseId),
    );
    return paginate(
      reviews.map((review) =>
        toUserReviewResponse(
          review,
          this.toImageSet,
          ratingOf(ratings, review.releaseId),
        ),
      ),
      total,
      query,
    );
  }

  /** A avaliação de quem está logado, para preencher o formulário. 404 se ainda não avaliou. */
  async getMine(user: AuthUser, slug: string): Promise<ReviewResponse> {
    const release = await this.findRelease(slug);
    const review = await this.prisma.review.findUnique({
      where: { userId_releaseId: { userId: user.id, releaseId: release.id } },
      include: { user: { select: authorSelect } },
    });
    if (!review) {
      throw new NotFoundException(
        apiError('review_not_found', 'Você ainda não avaliou este disco.'),
      );
    }
    return toReviewResponse(review, this.toImageSet);
  }

  /**
   * Cria a avaliação ou substitui a que já existe: uma por pessoa e por disco. Dois envios
   * simultâneos da mesma pessoa podem tentar criá-la ao mesmo tempo: o índice único barra o
   * segundo, e a nova tentativa já encontra a avaliação e a atualiza. (O `upsert` do Prisma
   * não evita isso sozinho com o adaptador que usamos; um teste contra o banco cobre o caso.)
   */
  async upsertMine(
    user: AuthUser,
    slug: string,
    dto: UpsertReviewDto,
  ): Promise<ReviewResponse> {
    const release = await this.findRelease(slug);
    if (!isReleased(release.releaseDate)) {
      throw new BadRequestException(
        apiError(
          'release_not_out',
          'Esse disco ainda não foi lançado, então ainda não pode receber nota.',
        ),
      );
    }

    // Substituição completa: enviar só a nota apaga o texto que havia.
    const data = { rating: dto.rating, body: dto.body ?? null };
    const save = () =>
      this.prisma.review.upsert({
        where: { userId_releaseId: { userId: user.id, releaseId: release.id } },
        create: { ...data, userId: user.id, releaseId: release.id },
        update: data,
        include: { user: { select: authorSelect } },
      });

    let review;
    try {
      review = await save();
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      review = await save();
    }
    return toReviewResponse(review, this.toImageSet);
  }

  /** Apaga a avaliação de quem está logado neste disco. */
  async deleteMine(user: AuthUser, slug: string): Promise<void> {
    const { count } = await this.prisma.review.deleteMany({
      where: { userId: user.id, release: { slug } },
    });
    if (count === 0) {
      throw new NotFoundException(
        apiError('review_not_found', 'Você ainda não avaliou este disco.'),
      );
    }
  }

  /** Apaga uma avaliação específica: o autor, ou um administrador (moderação). */
  async deleteById(user: AuthUser, id: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!review) {
      throw new NotFoundException(REVIEW_NOT_FOUND);
    }

    await this.authorization.authorize(ReviewPolicy, 'delete', user, review);
    await this.prisma.review.delete({ where: { id } });
  }

  private async findRelease(slug: string) {
    const release = await this.prisma.release.findUnique({
      where: { slug },
      select: { id: true, releaseDate: true },
    });
    if (!release) {
      throw new NotFoundException(RELEASE_NOT_FOUND);
    }
    return release;
  }
}
