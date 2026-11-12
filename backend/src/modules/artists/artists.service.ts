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
  artistSummaryInclude,
  releaseSummaryInclude,
  toArtistDetail,
  toArtistSummary,
  type ArtistDetail,
  type ArtistSummary,
} from '../catalog/catalog.mappers.js';
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
      where.name = { contains: query.q, mode: 'insensitive' };
    }
    if (query.genre) {
      // Um gênero inexistente resulta em lista vazia, não em erro.
      const genreIds = await this.genres.idsWithDescendants(query.genre);
      where.genres = { some: { genreId: { in: genreIds } } };
    }

    const [artists, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        include: artistSummaryInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.artist.count({ where }),
    ]);

    return paginate(
      artists.map((artist) => toArtistSummary(artist, this.toImageSet)),
      total,
      query,
    );
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

    return toArtistDetail(artist, releases, this.toImageSet);
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
      data: { imagePath: stored.path },
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
      data: { imagePath: null },
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
