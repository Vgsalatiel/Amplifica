import type { PrismaService } from '../../prisma/prisma.service.js';
import { toRatingSummary, type RatingSummary } from './rating.js';

export type RatingsByRelease = Map<string, RatingSummary>;

/** Médias de vários discos de uma vez (uma consulta só), para listas e cartões. */
export async function loadRatings(
  prisma: PrismaService,
  releaseIds: string[],
): Promise<RatingsByRelease> {
  const ratings: RatingsByRelease = new Map();
  if (releaseIds.length === 0) {
    return ratings;
  }
  const groups = await prisma.review.groupBy({
    by: ['releaseId'],
    where: { releaseId: { in: releaseIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const group of groups) {
    ratings.set(
      group.releaseId,
      toRatingSummary(group._avg.rating, group._count._all),
    );
  }
  return ratings;
}

/** A média de um disco; sem nenhuma avaliação, `{ average: null, count: 0 }`. */
export function ratingOf(
  ratings: RatingsByRelease,
  releaseId: string,
): RatingSummary {
  return ratings.get(releaseId) ?? toRatingSummary(null, 0);
}
