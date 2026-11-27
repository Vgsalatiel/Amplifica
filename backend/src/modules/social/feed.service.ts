import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ArtistsService } from '../artists/artists.service.js';
import { ImagesService, type ImageSet } from '../images/images.service.js';
import type { AuthUser } from '../users/user.types.js';
import { mergeFeed } from './feed.merge.js';
import { MAX_FOLLOWING } from './follows.service.js';
import type { FeedQuery } from './social.schemas.js';

interface FeedBase {
  id: string;
  /** Quando aconteceu (ISO). */
  at: string;
  user: { username: string; displayName: string; avatar: ImageSet | null };
}

export type FeedItem =
  | (FeedBase & {
      type: 'review';
      rating: number;
      /** Começo do texto da resenha, quando há. */
      excerpt: string | null;
      release: {
        slug: string;
        title: string;
        cover: ImageSet | null;
        artists: string[];
      };
    })
  | (FeedBase & {
      type: 'favorite';
      artist: { slug: string; name: string; image: ImageSet | null };
    })
  | (FeedBase & {
      type: 'clip';
      clip: {
        youtubeId: string;
        title: string;
        artist: { slug: string; name: string } | null;
      };
    })
  | (FeedBase & {
      type: 'attendance';
      show: {
        slug: string;
        title: string;
        date: string;
        city: string;
        state: string;
      };
    });

export interface FeedResponse {
  items: FeedItem[];
  /** Passe como `before` para a próxima página; `null` quando acabou. */
  next: string | null;
  /** Quantas pessoas a pessoa segue: com zero, o feed vazio explica como começar. */
  following: number;
}

const EXCERPT = 200;

const userSelect = {
  username: true,
  displayName: true,
  avatarPath: true,
} as const;

type Timed = { id: string; at: Date };
type Draft = Timed & { build: () => FeedItem };

/**
 * O feed de atividade de quem a pessoa segue: avaliações, bandas favoritas, clipes aprovados e "eu vou"
 * em shows. Só entra o que já é público no perfil: o "eu vou" só aparece de quem escolheu mostrar o nome.
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
    private readonly artists: ArtistsService,
  ) {}

  async forUser(me: AuthUser, query: FeedQuery): Promise<FeedResponse> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followedId: true },
      take: MAX_FOLLOWING,
    });
    const ids = follows.map((follow) => follow.followedId);
    if (ids.length === 0) {
      return { items: [], next: null, following: 0 };
    }

    const before = query.before ? new Date(query.before) : undefined;
    const when = before ? { lt: before } : undefined;
    // Cada fonte traz até `limit + 1` itens: o mais novo de todos nunca fica de fora, e o +1 diz se há mais.
    const take = query.limit + 1;
    const toUser = (user: {
      username: string;
      displayName: string;
      avatarPath: string | null;
    }) => ({
      username: user.username,
      displayName: user.displayName,
      avatar: this.images.toSet(user.avatarPath),
    });

    const [reviews, favorites, clips, attendances] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId: { in: ids }, createdAt: when },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          user: { select: userSelect },
          release: {
            select: {
              slug: true,
              title: true,
              coverPath: true,
              artists: {
                where: { role: 'PRIMARY' },
                orderBy: { position: 'asc' },
                select: { artist: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.prisma.artistFavorite.findMany({
        where: { userId: { in: ids }, createdAt: when },
        orderBy: [{ createdAt: 'desc' }, { artistId: 'asc' }],
        take,
        select: {
          userId: true,
          artistId: true,
          createdAt: true,
          user: { select: userSelect },
          artist: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.clip.findMany({
        where: {
          submittedById: { in: ids },
          status: 'APPROVED',
          createdAt: when,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take,
        select: {
          id: true,
          youtubeId: true,
          title: true,
          createdAt: true,
          submittedBy: { select: userSelect },
          artist: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.showAttendance.findMany({
        where: { userId: { in: ids }, showName: true, createdAt: when },
        orderBy: [{ createdAt: 'desc' }, { showId: 'asc' }],
        take,
        select: {
          userId: true,
          showId: true,
          createdAt: true,
          user: { select: userSelect },
          show: {
            select: {
              slug: true,
              name: true,
              date: true,
              city: true,
              state: true,
              acts: {
                orderBy: { position: 'asc' },
                take: 3,
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    // A imagem das bandas favoritas é a mesma das listas do site (capa do último álbum).
    const summaries = await this.artists.summariesByIds([
      ...new Set(favorites.map((favorite) => favorite.artistId)),
    ]);
    const imageOf = new Map(
      summaries.map((summary) => [summary.id, summary.image]),
    );

    const drafts: Draft[] = [
      ...reviews.map(
        (review): Draft => ({
          id: `review:${review.id}`,
          at: review.createdAt,
          build: () => ({
            id: `review:${review.id}`,
            type: 'review',
            at: review.createdAt.toISOString(),
            user: toUser(review.user),
            rating: review.rating,
            excerpt: review.body
              ? review.body.length > EXCERPT
                ? `${review.body.slice(0, EXCERPT - 1).trimEnd()}…`
                : review.body
              : null,
            release: {
              slug: review.release.slug,
              title: review.release.title,
              cover: this.images.toSet(review.release.coverPath),
              artists: review.release.artists.map((entry) => entry.artist.name),
            },
          }),
        }),
      ),
      ...favorites.map(
        (favorite): Draft => ({
          id: `favorite:${favorite.userId}:${favorite.artistId}`,
          at: favorite.createdAt,
          build: () => ({
            id: `favorite:${favorite.userId}:${favorite.artistId}`,
            type: 'favorite',
            at: favorite.createdAt.toISOString(),
            user: toUser(favorite.user),
            artist: {
              slug: favorite.artist.slug,
              name: favorite.artist.name,
              image: imageOf.get(favorite.artistId) ?? null,
            },
          }),
        }),
      ),
      ...clips.flatMap((clip): Draft[] =>
        clip.submittedBy
          ? [
              {
                id: `clip:${clip.id}`,
                at: clip.createdAt,
                build: () => ({
                  id: `clip:${clip.id}`,
                  type: 'clip',
                  at: clip.createdAt.toISOString(),
                  user: toUser(clip.submittedBy!),
                  clip: {
                    youtubeId: clip.youtubeId,
                    title: clip.title,
                    artist: clip.artist,
                  },
                }),
              },
            ]
          : [],
      ),
      ...attendances.map(
        (attendance): Draft => ({
          id: `attendance:${attendance.userId}:${attendance.showId}`,
          at: attendance.createdAt,
          build: () => ({
            id: `attendance:${attendance.userId}:${attendance.showId}`,
            type: 'attendance',
            at: attendance.createdAt.toISOString(),
            user: toUser(attendance.user),
            show: {
              slug: attendance.show.slug,
              title:
                attendance.show.name ??
                attendance.show.acts.map((act) => act.name).join(', '),
              date: attendance.show.date.toISOString().slice(0, 10),
              city: attendance.show.city,
              state: attendance.show.state,
            },
          }),
        }),
      ),
    ];

    const page = mergeFeed(drafts, query.limit);
    return {
      items: page.items.map((draft) => draft.build()),
      next: page.next,
      following: ids.length,
    };
  }
}
