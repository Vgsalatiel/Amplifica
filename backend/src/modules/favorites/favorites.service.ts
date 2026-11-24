import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ArtistsService } from '../artists/artists.service.js';
import type { ArtistSummary } from '../catalog/catalog.mappers.js';
import type { AuthUser } from '../users/user.types.js';

/** Teto de bandas favoritas por pessoa: evita lista sem fim e abuso. */
export const MAX_FAVORITES = 200;

export interface MyFavorite {
  favorite: boolean;
}

const ARTIST_NOT_FOUND = apiError('artist_not_found', 'Essa banda não existe.');
const USER_NOT_FOUND = apiError(
  'user_not_found',
  'Não existe um perfil com esse nome.',
);

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
  ) {}

  private async artistId(slug: string): Promise<string> {
    const artist = await this.prisma.artist.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!artist) {
      throw new NotFoundException(ARTIST_NOT_FOUND);
    }
    return artist.id;
  }

  /** Esta banda está entre as favoritas de quem está logado? */
  async mine(user: AuthUser, slug: string): Promise<MyFavorite> {
    const artistId = await this.artistId(slug);
    const found = await this.prisma.artistFavorite.findUnique({
      where: { userId_artistId: { userId: user.id, artistId } },
      select: { userId: true },
    });
    return { favorite: found !== null };
  }

  /** Marca a estrela. Repetir não faz mal. */
  async add(user: AuthUser, slug: string): Promise<MyFavorite> {
    const artistId = await this.artistId(slug);
    const already = await this.prisma.artistFavorite.findUnique({
      where: { userId_artistId: { userId: user.id, artistId } },
      select: { userId: true },
    });
    if (!already) {
      const total = await this.prisma.artistFavorite.count({
        where: { userId: user.id },
      });
      if (total >= MAX_FAVORITES) {
        throw new ConflictException(
          apiError(
            'favorites_limit',
            `Você chegou ao limite de ${MAX_FAVORITES} bandas favoritas. Tire uma estrela para marcar outra.`,
          ),
        );
      }
      await this.prisma.artistFavorite.createMany({
        data: [{ userId: user.id, artistId }],
        skipDuplicates: true,
      });
    }
    return { favorite: true };
  }

  /** Tira a estrela. Se não estava marcada, não faz nada. */
  async remove(user: AuthUser, slug: string): Promise<void> {
    const artistId = await this.artistId(slug);
    await this.prisma.artistFavorite.deleteMany({
      where: { userId: user.id, artistId },
    });
  }

  /** As bandas favoritas de uma pessoa, da mais recente para a mais antiga. Pública, como o perfil. */
  async listFor(username: string): Promise<ArtistSummary[]> {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    const rows = await this.prisma.artistFavorite.findMany({
      where: { userId: owner.id },
      orderBy: [{ createdAt: 'desc' }, { artistId: 'asc' }],
      take: MAX_FAVORITES,
      select: { artistId: true },
    });
    return this.artists.summariesByIds(rows.map((row) => row.artistId));
  }
}
