import type { Review, User } from '../../generated/prisma/client.js';
import {
  toReleaseSummary,
  type ReleaseSummary,
} from '../catalog/catalog.mappers.js';
import type { RatingSummary } from '../catalog/rating.js';
import type { ImageSet } from '../images/images.service.js';

type ToImageSet = (path: string | null) => ImageSet | null;

/** Uma avaliação alterada mais de um minuto depois de criada é marcada como editada. */
const EDITED_AFTER_MS = 60_000;

export interface ReviewResponse {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  /** Só o que é público do autor. Nunca o e-mail. */
  author: { username: string; displayName: string; avatar: ImageSet | null };
}

/** Avaliação na página de um perfil: traz o disco avaliado no lugar do autor. */
export interface UserReviewResponse {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  release: ReleaseSummary;
}

type Author = Pick<User, 'username' | 'displayName' | 'avatarPath'>;

/** O que o Prisma deve carregar do autor: só os três campos públicos. */
export const authorSelect = {
  username: true,
  displayName: true,
  avatarPath: true,
} as const;

function timestamps(review: Review) {
  return {
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    edited:
      review.updatedAt.getTime() - review.createdAt.getTime() > EDITED_AFTER_MS,
  };
}

export function toReviewResponse(
  review: Review & { user: Author },
  toImageSet: ToImageSet,
): ReviewResponse {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    ...timestamps(review),
    author: {
      username: review.user.username,
      displayName: review.user.displayName,
      avatar: toImageSet(review.user.avatarPath),
    },
  };
}

export function toUserReviewResponse(
  review: Review & { release: Parameters<typeof toReleaseSummary>[0] },
  toImageSet: ToImageSet,
  rating: RatingSummary,
): UserReviewResponse {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    ...timestamps(review),
    release: toReleaseSummary(review.release, toImageSet, rating),
  };
}
