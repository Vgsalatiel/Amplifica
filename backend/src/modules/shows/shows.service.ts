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
import { GenresService } from '../genres/genres.service.js';
import { ImagesService } from '../images/images.service.js';
import { monthRange, parseShowDate, todayInBrazil } from './show-date.js';
import {
  showInclude,
  toShowResponse,
  type ShowResponse,
} from './shows.mappers.js';
import type {
  CreateShowDto,
  ListShowsQuery,
  UpdateShowDto,
} from './shows.schemas.js';

const NOT_FOUND = apiError('show_not_found', 'Esse show não existe.');

@Injectable()
export class ShowsService {
  private readonly toImageSet: ImagesService['toSet'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly genres: GenresService,
    images: ImagesService,
  ) {
    this.toImageSet = (path) => images.toSet(path);
  }

  /** Agenda: por padrão, os shows de hoje em diante, do mais próximo para o mais distante. */
  async list(
    query: ListShowsQuery,
    now: Date = new Date(),
  ): Promise<Paginated<ShowResponse>> {
    const conditions: Prisma.ShowWhereInput[] = [];

    const today = todayInBrazil(now);
    if (query.when === 'upcoming') {
      conditions.push({ date: { gte: today } });
    } else if (query.when === 'past') {
      conditions.push({ date: { lt: today } });
    }
    if (query.month) {
      const range = monthRange(query.month);
      if (range) {
        conditions.push({ date: { gte: range.start, lt: range.end } });
      }
    }
    if (query.state) {
      conditions.push({ state: query.state });
    }
    if (query.city) {
      conditions.push({ city: { equals: query.city, mode: 'insensitive' } });
    }
    if (query.genre) {
      // Um gênero inexistente resulta em lista vazia, não em erro.
      const genreIds = await this.genres.idsWithDescendants(query.genre);
      conditions.push({ genres: { some: { genreId: { in: genreIds } } } });
    }
    if (query.artist) {
      conditions.push({ acts: { some: { artist: { slug: query.artist } } } });
    }
    // Cancelados só aparecem quando alguém pede por eles.
    conditions.push({ status: query.status ?? { not: 'CANCELLED' } });

    const where: Prisma.ShowWhereInput = { AND: conditions };
    const direction = query.when === 'upcoming' ? 'asc' : 'desc';

    const [shows, total] = await Promise.all([
      this.prisma.show.findMany({
        where,
        include: showInclude,
        orderBy: [{ date: direction }, { startTime: direction }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.show.count({ where }),
    ]);

    return paginate(
      shows.map((show) => toShowResponse(show, this.toImageSet)),
      total,
      query,
    );
  }

  async getBySlug(slug: string): Promise<ShowResponse> {
    const show = await this.prisma.show.findUnique({
      where: { slug },
      include: showInclude,
    });
    if (!show) {
      throw new NotFoundException(NOT_FOUND);
    }
    return toShowResponse(show, this.toImageSet);
  }

  async create(dto: CreateShowDto): Promise<ShowResponse> {
    const { acts, genreIds = [], slug: providedSlug, ...fields } = dto;
    await this.assertReferencesExist(
      acts.map((act) => act.artistId),
      genreIds,
    );
    const slug = await this.resolveSlug(providedSlug, () =>
      this.slugBase(dto.name, acts[0]?.name, dto.city, dto.date),
    );

    try {
      const show = await this.prisma.show.create({
        data: {
          ...fields,
          date: parseShowDate(dto.date) as Date,
          verifiedAt: dto.verifiedAt
            ? (parseShowDate(dto.verifiedAt) as Date)
            : undefined,
          slug,
          acts: { create: toActRows(acts) },
          genres: { create: genreIds.map((genreId) => ({ genreId })) },
        },
        include: showInclude,
      });
      return toShowResponse(show, this.toImageSet);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateShowDto): Promise<ShowResponse> {
    const current = await this.findOrFail(id);
    const { acts, genreIds, slug: providedSlug, ...fields } = dto;
    await this.assertReferencesExist(
      acts?.map((act) => act.artistId) ?? [],
      genreIds ?? [],
    );
    if (providedSlug !== undefined && providedSlug !== current.slug) {
      await this.resolveSlug(providedSlug, () => providedSlug);
    }

    try {
      const show = await this.prisma.show.update({
        where: { id },
        data: {
          ...fields,
          date: dto.date ? (parseShowDate(dto.date) as Date) : undefined,
          verifiedAt: dto.verifiedAt
            ? (parseShowDate(dto.verifiedAt) as Date)
            : undefined,
          slug: providedSlug,
          // Quando a escalação ou os gêneros vêm, substituem os anteriores por inteiro.
          ...(acts && {
            acts: { deleteMany: {}, create: toActRows(acts) },
          }),
          ...(genreIds && {
            genres: {
              deleteMany: {},
              create: genreIds.map((genreId) => ({ genreId })),
            },
          }),
        },
        include: showInclude,
      });
      return toShowResponse(show, this.toImageSet);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.prisma.show.delete({ where: { id } });
  }

  private async findOrFail(id: string) {
    const show = await this.prisma.show.findUnique({ where: { id } });
    if (!show) {
      throw new NotFoundException(NOT_FOUND);
    }
    return show;
  }

  /** Confere antes de gravar, para dizer exatamente qual referência não existe. */
  private async assertReferencesExist(
    artistIds: Array<string | null | undefined>,
    genreIds: string[],
  ): Promise<void> {
    const artists = [
      ...new Set(artistIds.filter((id): id is string => Boolean(id))),
    ];
    if (artists.length > 0) {
      const found = await this.prisma.artist.count({
        where: { id: { in: artists } },
      });
      if (found !== artists.length) {
        const message = 'Uma das bandas escolhidas não existe no catálogo.';
        throw new BadRequestException(
          apiError('artist_not_found', message, [{ field: 'acts', message }]),
        );
      }
    }
    if (genreIds.length > 0) {
      const found = await this.prisma.genre.count({
        where: { id: { in: genreIds } },
      });
      if (found !== genreIds.length) {
        const message = 'Um dos gêneros escolhidos não existe.';
        throw new BadRequestException(
          apiError('genre_not_found', message, [
            { field: 'genreIds', message },
          ]),
        );
      }
    }
  }

  /** Base do endereço: "linkin-park-sao-paulo-2027-03-15" (ou o nome do evento, no lugar da banda). */
  private slugBase(
    name: string | null | undefined,
    firstAct: string | undefined,
    city: string,
    date: string,
  ): string {
    return slugify(`${name ?? firstAct ?? 'show'} ${city} ${date}`);
  }

  private async resolveSlug(
    provided: string | undefined,
    base: () => string,
  ): Promise<string> {
    const isTaken = async (slug: string) =>
      (await this.prisma.show.count({ where: { slug } })) > 0;

    if (provided === undefined) {
      return uniqueSlug(base(), isTaken);
    }
    if (await isTaken(provided)) {
      const message = 'Esse endereço já está em uso por outro show.';
      throw new ConflictException(
        apiError('slug_taken', message, [{ field: 'slug', message }]),
      );
    }
    return provided;
  }

  private translate(error: unknown): unknown {
    if (isForeignKeyViolation(error)) {
      return new BadRequestException(
        apiError(
          'reference_not_found',
          'Uma banda ou um gênero escolhido não existe.',
        ),
      );
    }
    if (isUniqueViolation(error)) {
      return new ConflictException(
        apiError('show_conflict', 'Já existe um show com esse endereço.'),
      );
    }
    return error;
  }
}

/** A posição na escalação é a ordem em que as bandas chegam. */
function toActRows(
  acts: Array<{ name: string; artistId?: string | null }>,
): Array<{ position: number; name: string; artistId: string | null }> {
  return acts.map((act, position) => ({
    position,
    name: act.name,
    artistId: act.artistId ?? null,
  }));
}
