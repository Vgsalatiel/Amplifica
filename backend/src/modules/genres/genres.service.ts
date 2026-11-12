import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../common/prisma-errors.js';
import { slugify, uniqueSlug } from '../../common/slug.js';
import type { Genre } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { buildGenreTree, descendantIds, type GenreNode } from './genre-tree.js';
import type { CreateGenreDto, UpdateGenreDto } from './genres.schemas.js';

export interface GenreSummary {
  id: string;
  name: string;
  slug: string;
}

export interface GenreItem extends GenreSummary {
  description: string | null;
  parentId: string | null;
}

export interface GenreDetail extends GenreItem {
  parent: GenreSummary | null;
  children: GenreSummary[];
  artistCount: number;
}

const NOT_FOUND = apiError('genre_not_found', 'Esse gênero não existe.');

function toItem(genre: Genre): GenreItem {
  return {
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    description: genre.description,
    parentId: genre.parentId,
  };
}

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  /** A árvore completa. A tabela é pequena, então vem inteira em uma consulta. */
  async tree(): Promise<Array<GenreNode<GenreItem>>> {
    const genres = await this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });
    return buildGenreTree(genres.map(toItem));
  }

  async getBySlug(slug: string): Promise<GenreDetail> {
    const genre = await this.prisma.genre.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { artists: true } },
      },
    });
    if (!genre) {
      throw new NotFoundException(NOT_FOUND);
    }
    return {
      ...toItem(genre),
      parent: genre.parent,
      children: genre.children,
      artistCount: genre._count.artists,
    };
  }

  /** Ids do gênero e de todos os seus subgêneros: quem filtra por "Metal" vê também "Metalcore". */
  async idsWithDescendants(slug: string): Promise<string[]> {
    const genres = await this.prisma.genre.findMany({
      select: { id: true, parentId: true, slug: true },
    });
    const root = genres.find((genre) => genre.slug === slug);
    return root ? [root.id, ...descendantIds(genres, root.id)] : [];
  }

  async create(dto: CreateGenreDto): Promise<GenreItem> {
    await this.assertNameFree(dto.name);
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const genre = await this.prisma.genre.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          parentId: dto.parentId ?? null,
        },
      });
      return toItem(genre);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(id: string, dto: UpdateGenreDto): Promise<GenreItem> {
    const current = await this.prisma.genre.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(NOT_FOUND);
    }

    if (dto.name !== undefined && dto.name !== current.name) {
      await this.assertNameFree(dto.name);
    }
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      await this.resolveSlug(dto.slug, dto.slug);
    }
    if (dto.parentId) {
      await this.assertNoCycle(id, dto.parentId);
    }

    try {
      const genre = await this.prisma.genre.update({
        where: { id },
        data: dto,
      });
      return toItem(genre);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async remove(id: string): Promise<void> {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: { _count: { select: { children: true, artists: true } } },
    });
    if (!genre) {
      throw new NotFoundException(NOT_FOUND);
    }

    const { children, artists } = genre._count;
    if (children > 0 || artists > 0) {
      const reasons = [
        children > 0 ? `${children} subgênero(s)` : null,
        artists > 0 ? `${artists} artista(s)` : null,
      ].filter(Boolean);
      throw new ConflictException(
        apiError(
          'genre_in_use',
          `Não dá para excluir "${genre.name}": há ${reasons.join(' e ')} ligados a ele.`,
        ),
      );
    }

    await this.prisma.genre.delete({ where: { id } });
  }

  /** Um gênero não pode ficar embaixo de si mesmo nem de um dos seus descendentes. */
  private async assertNoCycle(id: string, parentId: string): Promise<void> {
    const genres = await this.prisma.genre.findMany({
      select: { id: true, parentId: true },
    });
    if (parentId === id || descendantIds(genres, id).includes(parentId)) {
      const message =
        'Um gênero não pode ser subgênero dele mesmo nem de um subgênero seu.';
      throw new BadRequestException(
        apiError('genre_cycle', message, [{ field: 'parentId', message }]),
      );
    }
  }

  private async assertNameFree(name: string): Promise<void> {
    const existing = await this.prisma.genre.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      const message = 'Já existe um gênero com esse nome.';
      throw new ConflictException(
        apiError('genre_name_taken', message, [{ field: 'name', message }]),
      );
    }
  }

  /** Slug informado: precisa estar livre. Slug ausente: gera um livre a partir do nome. */
  private async resolveSlug(
    provided: string | undefined,
    name: string,
  ): Promise<string> {
    const isTaken = async (slug: string) =>
      (await this.prisma.genre.count({ where: { slug } })) > 0;

    if (provided === undefined) {
      return uniqueSlug(slugify(name), isTaken);
    }
    if (await isTaken(provided)) {
      const message = 'Esse endereço já está em uso por outro gênero.';
      throw new ConflictException(
        apiError('slug_taken', message, [{ field: 'slug', message }]),
      );
    }
    return provided;
  }

  private translate(error: unknown): unknown {
    if (isForeignKeyViolation(error)) {
      const message = 'O gênero pai escolhido não existe.';
      return new BadRequestException(
        apiError('parent_not_found', message, [{ field: 'parentId', message }]),
      );
    }
    if (isUniqueViolation(error)) {
      return new ConflictException(
        apiError(
          'genre_conflict',
          'Já existe um gênero com esse nome ou endereço.',
        ),
      );
    }
    return error;
  }
}
