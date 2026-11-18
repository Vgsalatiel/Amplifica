import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apiError } from '../../common/api-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImagesService, type ImageSet } from '../images/images.service.js';
import type { AuthUser } from '../users/user.types.js';

/** Nota média a partir da qual a pessoa "gosta" de uma banda. */
const LIKE_FROM = 7;
/** Nota média a partir da qual a pessoa "recomenda" uma banda. */
const RECOMMEND_FROM = 8;
/** Bandas em comum necessárias para calcular a porcentagem: com uma só, ela não diz nada. */
const MIN_SHARED_FOR_SCORE = 2;
const LIST_LIMIT = 12;

interface ArtistRef {
  slug: string;
  name: string;
  image: ImageSet | null;
}

export interface TasteResponse {
  /** 0 a 100, ou `null` quando há poucas bandas avaliadas por ambos. */
  score: number | null;
  /** Bandas que as duas pessoas avaliaram. */
  sharedCount: number;
  myRatedCount: number;
  theirRatedCount: number;
  /** Bandas que as duas gostam (média de 7 ou mais), as mais altas primeiro. */
  bothLike: Array<{ artist: ArtistRef; mine: number; theirs: number }>;
  /** Bandas que a outra pessoa recomenda (média de 8 ou mais) e que você ainda não avaliou. */
  recommended: Array<{ artist: ArtistRef; theirs: number }>;
}

interface Tally {
  artist: { id: string; slug: string; name: string; imagePath: string | null };
  sum: number;
  count: number;
}

const average = (tally: Tally) => tally.sum / tally.count;
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Compara o gosto de duas pessoas pelas notas que deram a discos. A nota de uma banda é a média
 * dos discos dela que a pessoa avaliou (a banda principal do disco, não participações).
 */
@Injectable()
export class TasteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  async compare(me: AuthUser, username: string): Promise<TasteResponse> {
    const other = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!other) {
      throw new NotFoundException(
        apiError('user_not_found', 'Não existe um perfil com esse nome.'),
      );
    }
    if (other.id === me.id) {
      throw new BadRequestException(
        apiError(
          'own_profile',
          'Esse é o seu perfil. Abra o de outra pessoa para comparar.',
        ),
      );
    }

    const reviews = await this.prisma.review.findMany({
      where: { userId: { in: [me.id, other.id] } },
      select: {
        userId: true,
        rating: true,
        release: {
          select: {
            artists: {
              where: { role: 'PRIMARY' },
              select: {
                artist: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    imagePath: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const mine = new Map<string, Tally>();
    const theirs = new Map<string, Tally>();
    for (const review of reviews) {
      const target = review.userId === me.id ? mine : theirs;
      for (const { artist } of review.release.artists) {
        const tally = target.get(artist.id) ?? { artist, sum: 0, count: 0 };
        tally.sum += review.rating;
        tally.count += 1;
        target.set(artist.id, tally);
      }
    }

    const ref = (artist: Tally['artist']): ArtistRef => ({
      slug: artist.slug,
      name: artist.name,
      image: this.images.toSet(artist.imagePath),
    });

    const shared = [...mine.values()].flatMap((own) => {
      const their = theirs.get(own.artist.id);
      return their ? [{ own, their }] : [];
    });

    const score =
      shared.length >= MIN_SHARED_FOR_SCORE
        ? Math.round(
            100 *
              (1 -
                shared.reduce(
                  (sum, pair) =>
                    sum + Math.abs(average(pair.own) - average(pair.their)),
                  0,
                ) /
                  shared.length /
                  9),
          )
        : null;

    const bothLike = shared
      .filter(
        (pair) =>
          average(pair.own) >= LIKE_FROM && average(pair.their) >= LIKE_FROM,
      )
      .sort(
        (a, b) =>
          average(b.own) +
          average(b.their) -
          (average(a.own) + average(a.their)),
      )
      .slice(0, LIST_LIMIT)
      .map((pair) => ({
        artist: ref(pair.own.artist),
        mine: round1(average(pair.own)),
        theirs: round1(average(pair.their)),
      }));

    const recommended = [...theirs.values()]
      .filter(
        (their) =>
          !mine.has(their.artist.id) && average(their) >= RECOMMEND_FROM,
      )
      .sort((a, b) => average(b) - average(a) || a.artist.name.localeCompare(b.artist.name))
      .slice(0, LIST_LIMIT)
      .map((their) => ({
        artist: ref(their.artist),
        theirs: round1(average(their)),
      }));

    return {
      score,
      sharedCount: shared.length,
      myRatedCount: mine.size,
      theirRatedCount: theirs.size,
      bothLike,
      recommended,
    };
  }
}
