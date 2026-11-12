import type {
  Artist,
  ArtistType,
  DatePrecision,
  Genre,
  Release,
  ReleaseArtistRole,
  ReleaseType,
  Track,
} from '../../generated/prisma/client.js';
import type { ImageSet } from '../images/images.service.js';
import { formatReleaseDate } from '../releases/release-date.js';

/**
 * Formato das respostas do catálogo. As funções daqui transformam linhas do banco
 * no que o frontend recebe: caminhos de imagem viram URLs, datas viram texto, e
 * campos internos (mbid, timestamps) ficam de fora.
 */
type ToImageSet = (path: string | null) => ImageSet | null;

export interface GenreRef {
  id: string;
  name: string;
  slug: string;
}

export interface ArtistRef {
  id: string;
  name: string;
  slug: string;
}

export interface ArtistSummary extends ArtistRef {
  type: ArtistType;
  country: string | null;
  image: ImageSet | null;
  genres: GenreRef[];
}

export interface ReleaseSummary {
  id: string;
  title: string;
  slug: string;
  type: ReleaseType;
  releaseDate: string;
  datePrecision: DatePrecision;
  cover: ImageSet | null;
  accentColor: string | null;
  artists: Array<ArtistRef & { role: ReleaseArtistRole }>;
}

export interface ArtistDetail extends ArtistSummary {
  bio: string | null;
  city: string | null;
  formedYear: number | null;
  disbandedYear: number | null;
  releases: ReleaseSummary[];
}

export interface TrackResponse {
  id: string;
  title: string;
  discNumber: number;
  position: number;
  durationMs: number | null;
}

export interface ReleaseDetail extends ReleaseSummary {
  description: string | null;
  youtubeVideoId: string | null;
  tracks: TrackResponse[];
  /** Soma das durações conhecidas; `null` se nenhuma faixa tem duração. */
  durationMs: number | null;
}

/** `include` do Prisma que os mappers esperam. */
export const artistSummaryInclude = {
  genres: { include: { genre: true }, orderBy: { genre: { name: 'asc' } } },
} as const;

export const releaseSummaryInclude = {
  artists: { include: { artist: true }, orderBy: { position: 'asc' } },
} as const;

type ArtistWithGenres = Artist & { genres: Array<{ genre: Genre }> };
type ReleaseWithArtists = Release & {
  artists: Array<{ role: ReleaseArtistRole; artist: Artist }>;
};

export function toArtistSummary(
  artist: ArtistWithGenres,
  toImageSet: ToImageSet,
): ArtistSummary {
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    type: artist.type,
    country: artist.country,
    image: toImageSet(artist.imagePath),
    genres: artist.genres.map(({ genre }) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
    })),
  };
}

export function toReleaseSummary(
  release: ReleaseWithArtists,
  toImageSet: ToImageSet,
): ReleaseSummary {
  return {
    id: release.id,
    title: release.title,
    slug: release.slug,
    type: release.type,
    releaseDate: formatReleaseDate(release.releaseDate, release.datePrecision),
    datePrecision: release.datePrecision,
    cover: toImageSet(release.coverPath),
    accentColor: release.accentColor,
    artists: release.artists.map(({ role, artist }) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      role,
    })),
  };
}

export function toArtistDetail(
  artist: ArtistWithGenres,
  releases: ReleaseWithArtists[],
  toImageSet: ToImageSet,
): ArtistDetail {
  return {
    ...toArtistSummary(artist, toImageSet),
    bio: artist.bio,
    city: artist.city,
    formedYear: artist.formedYear,
    disbandedYear: artist.disbandedYear,
    releases: releases.map((release) => toReleaseSummary(release, toImageSet)),
  };
}

export function toReleaseDetail(
  release: ReleaseWithArtists & { tracks: Track[] },
  toImageSet: ToImageSet,
): ReleaseDetail {
  const durations = release.tracks
    .map((track) => track.durationMs)
    .filter((duration): duration is number => duration !== null);

  return {
    ...toReleaseSummary(release, toImageSet),
    description: release.description,
    youtubeVideoId: release.youtubeVideoId,
    tracks: release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      discNumber: track.discNumber,
      position: track.position,
      durationMs: track.durationMs,
    })),
    durationMs:
      durations.length > 0
        ? durations.reduce((sum, value) => sum + value, 0)
        : null,
  };
}
