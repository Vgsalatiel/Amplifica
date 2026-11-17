import type { ClipStatus } from '../../generated/prisma/client.js';

/** `include` do Prisma que os mappers esperam. */
export const clipInclude = {
  artist: { select: { slug: true, name: true } },
  submittedBy: { select: { username: true, displayName: true } },
} as const;

interface ClipRow {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  pinned: boolean;
  status: ClipStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  artist: { slug: string; name: string } | null;
  submittedBy: { username: string; displayName: string } | null;
}

/** O que qualquer visitante vê na playlist. */
export interface ClipResponse {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  pinned: boolean;
  /** A banda no catálogo, quando alguém a ligou ao clipe. */
  artist: { slug: string; name: string } | null;
  /** Quem sugeriu. Os clipes fixos não mostram autor. */
  suggestedBy: { username: string; displayName: string } | null;
  createdAt: string;
}

/** Uma sugestão vista por quem a enviou: inclui a situação. */
export interface MyClipResponse {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  status: ClipStatus;
  createdAt: string;
}

/** Uma linha da tela de administração. */
export interface ReviewClipResponse extends ClipResponse {
  status: ClipStatus;
  reviewedAt: string | null;
}

export function toClipResponse(clip: ClipRow): ClipResponse {
  return {
    id: clip.id,
    youtubeId: clip.youtubeId,
    title: clip.title,
    channelName: clip.channelName,
    pinned: clip.pinned,
    artist: clip.artist,
    suggestedBy: clip.pinned ? null : clip.submittedBy,
    createdAt: clip.createdAt.toISOString(),
  };
}

export function toMyClipResponse(clip: ClipRow): MyClipResponse {
  return {
    id: clip.id,
    youtubeId: clip.youtubeId,
    title: clip.title,
    channelName: clip.channelName,
    status: clip.status,
    createdAt: clip.createdAt.toISOString(),
  };
}

export function toReviewClipResponse(clip: ClipRow): ReviewClipResponse {
  return {
    ...toClipResponse(clip),
    // Na administração o autor aparece mesmo nos fixos (quando existe).
    suggestedBy: clip.submittedBy,
    status: clip.status,
    reviewedAt: clip.reviewedAt?.toISOString() ?? null,
  };
}
