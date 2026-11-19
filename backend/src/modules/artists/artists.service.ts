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
import { artistIdsMatching } from '../../common/search.js';
import { slugify, uniqueSlug } from '../../common/slug.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  artistSummaryInclude,
  releaseSummaryInclude,
  toArtistDetail,
  toArtistSummary,
  type ArtistDetail,
  type ArtistSummary,
} from '../catalog/catalog.mappers.js';
import { pickFallbackCover } from '../catalog/catalog.mappers.js';
import { loadRatings } from '../catalog/ratings.js';
import { GenresService } from '../genres/genres.service.js';
import { ImagesService } from '../images/images.service.js';
import type {
  CreateArtistDto,
  ListArtistsQuery,
  UpdateArtistDto,
} from './artists.schemas.js';

const NOT_FOUND = apiError('artist_not_found', 'Esse artista não existe.');

@Injectable()
export class ArtistsService {
  private readonly toImageSet: ImagesService['toSet'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly genres: GenresService,
    private readonly images: ImagesService,
  ) {
    this.toImageSet = (path) => this.images.toSet(path);
  }

  async list(query: ListArtistsQuery): Promise<Paginated<ArtistSummary>> {
    const where: Prisma.ArtistWhereInput = {};
    if (query.q) {
      // Sem acento e sem diferença de maiúsculas: "slipknót" acha "Slipknot".
      where.id = { in: await artistIdsMatching(this.prisma, query.q) };
    }
    if (query.genre) {
      // Um gênero inexistente resulta em lista vazia, não em erro.
      const genreIds = await this.genres.idsWithDescendants(query.genre);
      where.genres = { some: { genreId: { in: genreIds } } };
    }

    if (query.country) {
      where.country = query.country;
    }
    if (query.formedFrom) {
      where.formedYear = { gte: query.formedFrom };
    }

    const orderBy: Prisma.ArtistOrderByWithRelationInput[] =
      query.sort === 'newest'
        ? [
            { formedYear: { sort: 'desc', nulls: 'last' } },
            { name: 'asc' },
            { id: 'asc' },
          ]
        : [{ name: 'asc' }, { id: 'asc' }];

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        include: artistSummaryInclude,
        orderBy,
        ...toSkipTake(query),
      }),
      this.prisma.artist.count({ where }),
    ]);

    // Banda sem foto mostra a capa de um disco dela.
    const covers = await this.fallbackCovers(
      artists.filter((artist) => !artist.imagePath).map((artist) => artist.id),
    );
    return paginate(
      artists.map((artist) =>
        toArtistSummary(
          artist,
          this.toImageSet,
          covers.get(artist.id) ?? null,
        ),
      ),
      total,
      query,
    );
  }

  /** Para cada banda da lista, o caminho da capa que serve de foto quando ela não tem uma. */
  private async fallbackCovers(
    artistIds: string[],
  ): Promise<Map<string, string>> {
    const covers = new Map<string, string>();
    if (artistIds.length === 0) {
      return covers;
    }
    const own = { artistId: { in: artistIds }, role: 'PRIMARY' as const };
    const releases = await this.prisma.release.findMany({
      where: { coverPath: { not: null }, artists: { some: own } },
      select: {
        coverPath: true,
        type: true,
        releaseDate: true,
        artists: { where: own, select: { artistId: true } },
      },
    });
    const byArtist = new Map<string, typeof releases>();
    for (const release of releases) {
      for (const { artistId } of release.artists) {
        byArtist.set(artistId, [...(byArtist.get(artistId) ?? []), release]);
      }
    }
    for (const [artistId, list] of byArtist) {
      const path = pickFallbackCover(list);
      if (path) {
        covers.set(artistId, path);
      }
    }
    return covers;
  }

  async getBySlug(slug: string): Promise<ArtistDetail> {
    const artist = await this.prisma.artist.findUnique({
      where: { slug },
      include: artistSummaryInclude,
    });
    if (!artist) {
      throw new NotFoundException(NOT_FOUND);
    }

    // Discografia: do mais recente para o mais antigo.
    const releases = await this.prisma.release.findMany({
      where: { artists: { some: { artistId: artist.id } } },
      include: releaseSummaryInclude,
      orderBy: [{ releaseDate: 'desc' }, { title: 'asc' }],
    });

    const ratings = await loadRatings(
      this.prisma,
      releases.map((release) => release.id),
    );
    return toArtistDetail(artist, releases, this.toImageSet, ratings);
  }

  async create(dto: CreateArtistDto): Promise<ArtistSummary> {
    const { genreIds = [], slug: providedSlug, ...fields } = dto;
    const slug = await this.resolveSlug(providedSlug, dto.name);

    try {
      const artist = await this.prisma.artist.create({
        data: {
          ...fields,
          slug,
          genres: { create: genreIds.map((genreId) => ({ genreId })) },
        },
        include: artistSummaryInclude,
      });
      return toArtistSummary(artist, this.toImageSet);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateArtistDto): Promise<ArtistSummary> {
    const current = await this.findOrFail(id);
    const { genreIds, slug: providedSlug, ...fields } = dto;
    if (providedSlug !== undefined && providedSlug !== current.slug) {
      await this.resolveSlug(providedSlug, providedSlug);
    }

    try {
      const artist = await this.prisma.artist.update({
        where: { id },
        data: {
          ...fields,
          slug: providedSlug,
          // Quando a lista de gêneros vem, ela substitui a anterior por inteiro.
          ...(genreIds && {
            genres: {
              deleteMany: {},
              create: genreIds.map((genreId) => ({ genreId })),
            },
          }),
        },
        include: artistSummaryInclude,
      });
      return toArtistSummary(artist, this.toImageSet);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(id: string): Promise<void> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: { _count: { select: { releases: true } } },
    });
    if (!artist) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (artist._count.releases > 0) {
      throw new ConflictException(
        apiError(
          'artist_has_releases',
          `Não dá para excluir "${artist.name}": há ${artist._count.releases} lançamento(s) ligados a esse artista. Exclua-os primeiro.`,
        ),
      );
    }

    await this.prisma.artist.delete({ where: { id } });
    await this.images.remove(artist.imagePath);
  }

  async setImage(
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<ArtistSummary> {
    const current = await this.findOrFail(id);
    const stored = await this.images.store('artists', id, file);

    const artist = await this.prisma.artist.update({
      where: { id },
      // Foto nova enviada pelo admin: o crédito da foto anterior não vale para ela.
      data: { imagePath: stored.path, imageCredit: Prisma.DbNull },
      include: artistSummaryInclude,
    });
    // A imagem antiga só é apagada depois que o banco já aponta para a nova.
    if (current.imagePath !== stored.path) {
      await this.images.remove(current.imagePath);
    }
    return toArtistSummary(artist, this.toImageSet);
  }

  async removeImage(id: string): Promise<ArtistSummary> {
    const current = await this.findOrFail(id);
    const artist = await this.prisma.artist.update({
      where: { id },
      data: { imagePath: null, imageCredit: Prisma.DbNull },
      include: artistSummaryInclude,
    });
    await this.images.remove(current.imagePath);
    return toArtistSummary(artist, this.toImageSet);
  }

  private async findOrFail(id: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      throw new NotFoundException(NOT_FOUND);
    }
    return artist;
  }

  private async resolveSlug(
    provided: string | undefined,
    name: string,
  ): Promise<string> {
    const isTaken = async (slug: string) =>
      (await this.prisma.artist.count({ where: { slug } })) > 0;

    if (provided === undefined) {
      return uniqueSlug(slugify(name), isTaken);
    }
    if (await isTaken(provided)) {
      const message = 'Esse endereço já está em uso por outro artista.';
      throw new ConflictException(
        apiError('slug_taken', message, [{ field: 'slug', message }]),
      );
    }
    return provided;
  }

  private translate(error: unknown): unknown {
    if (isForeignKeyViolation(error)) {
      const message = 'Um dos gêneros escolhidos não existe.';
      return new BadRequestException(
        apiError('genre_not_found', message, [{ field: 'genreIds', message }]),
      );
    }
    if (isUniqueViolation(error)) {
      return new ConflictException(
        apiError('artist_conflict', 'Já existe um artista com esse endereço.'),
      );
    }
    return error;
  }
}
