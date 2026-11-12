import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import {
  paginate,
  toSkipTake,
  type Paginated,
} from '../../common/pagination.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../common/prisma-errors.js';
import { slugify, uniqueSlug } from '../../common/slug.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  releaseSummaryInclude,
  toReleaseDetail,
  toReleaseSummary,
  type ReleaseDetail,
  type ReleaseSummary,
} from '../catalog/catalog.mappers.js';
import { toRatingSummary } from '../catalog/rating.js';
import { ImagesService } from '../images/images.service.js';
import { parseReleaseDate } from './release-date.js';
import type {
  CreateReleaseDto,
  ListReleasesQuery,
  UpdateReleaseDto,
} from './releases.schemas.js';

const NOT_FOUND = apiError('release_not_found', 'Esse lançamento não existe.');

const detailInclude = {
  ...releaseSummaryInclude,
  tracks: { orderBy: [{ discNumber: 'asc' }, { position: 'asc' }] },
} satisfies Prisma.ReleaseInclude;

@Injectable()
export class ReleasesService {
  private readonly toImageSet: ImagesService['toSet'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {
    this.toImageSet = (path) => this.images.toSet(path);
  }

  /** Lançamentos do mais recente para o mais antigo. */
  async list(query: ListReleasesQuery): Promise<Paginated<ReleaseSummary>> {
    const where: Prisma.ReleaseWhereInput = {};
    if (query.type) {
      where.type = query.type;
    }
    if (query.artist) {
      where.artists = { some: { artist: { slug: query.artist } } };
    }

    const [releases, total] = await Promise.all([
      this.prisma.release.findMany({
        where,
        include: releaseSummaryInclude,
        orderBy: [{ releaseDate: 'desc' }, { id: 'desc' }],
        ...toSkipTake(query),
      }),
      this.prisma.release.count({ where }),
    ]);

    return paginate(
      releases.map((release) => toReleaseSummary(release, this.toImageSet)),
      total,
      query,
    );
  }

  async getBySlug(slug: string): Promise<ReleaseDetail> {
    const release = await this.prisma.release.findUnique({
      where: { slug },
      include: detailInclude,
    });
    if (!release) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.detail(release);
  }

  async create(dto: CreateReleaseDto): Promise<ReleaseDetail> {
    const { date, precision } = parseReleaseDate(dto.releaseDate)!;
    const slug = await this.resolveSlug(dto.slug, () =>
      this.defaultSlugBase(dto),
    );

    try {
      const release = await this.prisma.release.create({
        data: {
          title: dto.title,
          slug,
          type: dto.type,
          releaseDate: date,
          datePrecision: precision,
          description: dto.description ?? null,
          youtubeVideoId: dto.youtube ?? null,
          accentColor: dto.accentColor ?? null,
          artists: { create: toArtistRows(dto.artists) },
          tracks: { create: dto.tracks ?? [] },
        },
        include: detailInclude,
      });
      return this.detail(release);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<ReleaseDetail> {
    const current = await this.findOrFail(id);
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      await this.resolveSlug(dto.slug, () => Promise.resolve(dto.slug!));
    }
    const parsedDate = dto.releaseDate
      ? parseReleaseDate(dto.releaseDate)!
      : undefined;

    try {
      // Artistas e faixas, quando enviados, substituem os anteriores por inteiro.
      // Tudo acontece em uma transação: ou o lançamento muda por completo, ou não muda.
      const release = await this.prisma.$transaction(async (tx) => {
        if (dto.artists) {
          await tx.releaseArtist.deleteMany({ where: { releaseId: id } });
        }
        if (dto.tracks) {
          await tx.track.deleteMany({ where: { releaseId: id } });
        }
        return tx.release.update({
          where: { id },
          data: {
            title: dto.title,
            slug: dto.slug,
            type: dto.type,
            releaseDate: parsedDate?.date,
            datePrecision: parsedDate?.precision,
            description: dto.description,
            youtubeVideoId: dto.youtube,
            accentColor: dto.accentColor,
            ...(dto.artists && {
              artists: { create: toArtistRows(dto.artists) },
            }),
            ...(dto.tracks && { tracks: { create: dto.tracks } }),
          },
          include: detailInclude,
        });
      });
      return this.detail(release);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(id: string): Promise<void> {
    const release = await this.findOrFail(id);
    // Faixas e vínculos com artistas saem junto (ON DELETE CASCADE).
    await this.prisma.release.delete({ where: { id } });
    await this.images.remove(release.coverPath);
  }

  /** Grava a capa e, a partir dela, a cor de destaque da página do lançamento. */
  async setCover(
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<ReleaseDetail> {
    const current = await this.findOrFail(id);
    const stored = await this.images.store('covers', id, file);

    const release = await this.prisma.release.update({
      where: { id },
      data: { coverPath: stored.path, accentColor: stored.accentColor },
      include: detailInclude,
    });
    if (current.coverPath !== stored.path) {
      await this.images.remove(current.coverPath);
    }
    return this.detail(release);
  }

  async removeCover(id: string): Promise<ReleaseDetail> {
    const current = await this.findOrFail(id);
    const release = await this.prisma.release.update({
      where: { id },
      data: { coverPath: null, accentColor: null },
      include: detailInclude,
    });
    await this.images.remove(current.coverPath);
    return this.detail(release);
  }

  /**
   * Resposta de um disco: os dados dele mais a média e a contagem das avaliações. Todo caminho
   * que devolve um disco passa por aqui, para a resposta ter sempre o mesmo formato.
   */
  private async detail(
    release: Parameters<typeof toReleaseDetail>[0],
  ): Promise<ReleaseDetail> {
    const stats = await this.prisma.review.aggregate({
      where: { releaseId: release.id },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return toReleaseDetail(
      release,
      this.toImageSet,
      toRatingSummary(stats._avg.rating, stats._count._all),
    );
  }

  private async findOrFail(id: string) {
    const release = await this.prisma.release.findUnique({ where: { id } });
    if (!release) {
      throw new NotFoundException(NOT_FOUND);
    }
    return release;
  }

  /**
   * Endereço padrão: artista principal + título ("vidro-fosco-tudo-que-sobrou-do-inverno").
   * Títulos como "Ao Vivo" ou "Demo" se repetem entre bandas; o nome do artista os distingue.
   */
  private async defaultSlugBase(dto: CreateReleaseDto): Promise<string> {
    const primary = dto.artists.find((artist) => artist.role === 'PRIMARY')!;
    const artist = await this.prisma.artist.findUnique({
      where: { id: primary.artistId },
      select: { slug: true },
    });
    return slugify(`${artist?.slug ?? ''} ${dto.title}`);
  }

  private async resolveSlug(
    provided: string | undefined,
    defaultBase: () => Promise<string>,
  ): Promise<string> {
    const isTaken = async (slug: string) =>
      (await this.prisma.release.count({ where: { slug } })) > 0;

    if (provided === undefined) {
      return uniqueSlug(await defaultBase(), isTaken);
    }
    if (await isTaken(provided)) {
      const message = 'Esse endereço já está em uso por outro lançamento.';
      throw new ConflictException(
        apiError('slug_taken', message, [{ field: 'slug', message }]),
      );
    }
    return provided;
  }

  private translate(error: unknown): unknown {
    if (isForeignKeyViolation(error)) {
      const message = 'Um dos artistas escolhidos não existe.';
      return new BadRequestException(
        apiError('artist_not_found', message, [{ field: 'artists', message }]),
      );
    }
    if (isUniqueViolation(error)) {
      return new ConflictException(
        apiError(
          'release_conflict',
          'Já existe um lançamento com esse endereço.',
        ),
      );
    }
    return error;
  }
}

/** A posição segue a ordem em que os artistas foram enviados. */
function toArtistRows(artists: CreateReleaseDto['artists']) {
  return artists.map((artist, position) => ({
    artistId: artist.artistId,
    role: artist.role,
    position,
  }));
}
