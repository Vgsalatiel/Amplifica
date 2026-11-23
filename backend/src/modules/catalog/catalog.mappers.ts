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
import type { RatingSummary } from './rating.js';
import { ratingOf, type RatingsByRelease } from './ratings.js';

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
  /** `true` quando não há foto cadastrada e `image` é a capa de um disco da banda. */
  imageFromRelease: boolean;
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
  /** Média e contagem das avaliações; `average` é null enquanto ninguém avaliou. */
  rating: RatingSummary;
  artists: Array<ArtistRef & { role: ReleaseArtistRole }>;
}

export interface Source {
  name: string;
  url: string;
}

/** Crédito de uma foto com licença livre: quem fez, sob qual licença e onde está o original. */
export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

const isHttps = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('https://');

/** Lê o crédito gravado no banco; devolve `null` se faltar algo, para nunca mostrar crédito pela metade. */
export function parseImageCredit(value: unknown): ImageCredit | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { author, license, licenseUrl, sourceUrl } = value as Record<
    string,
    unknown
  >;
  return typeof author === 'string' &&
    author.trim() &&
    typeof license === 'string' &&
    license.trim() &&
    isHttps(licenseUrl) &&
    isHttps(sourceUrl)
    ? { author, license, licenseUrl, sourceUrl }
    : null;
}

/** Uma curiosidade da seção "Você sabia?", sempre com a fonte de onde veio. */
export interface ArtistFact {
  text: string;
  sourceName: string;
  sourceUrl: string;
}

/** Lê as curiosidades gravadas no banco; descarta as que estão incompletas ou com link que não seja https. */
export function parseFacts(value: unknown): ArtistFact[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item): ArtistFact[] => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const { text, sourceName, sourceUrl } = item as Record<string, unknown>;
    return typeof text === 'string' &&
      text.trim() &&
      typeof sourceName === 'string' &&
      sourceName.trim() &&
      isHttps(sourceUrl)
      ? [{ text, sourceName, sourceUrl }]
      : [];
  });
}

export interface ArtistDetail extends ArtistSummary {
  /** Só existe para foto própria da banda (nunca para a capa emprestada de um disco). */
  imageCredit: ImageCredit | null;
  bio: string | null;
  sources: Source[];
  /** Curiosidades com fonte; vazio quando a banda ainda não tem. */
  facts: ArtistFact[];
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

/** Qual disco empresta a capa para uma banda sem foto: álbum antes de EP, EP antes de single; o mais recente de cada tipo. */
const COVER_RANK: Record<ReleaseType, number> = {
  ALBUM: 0,
  EP: 1,
  COMPILATION: 2,
  LIVE: 3,
  SINGLE: 4,
};

/**
 * A capa do disco que representa a banda: álbum antes de EP, EP antes de single, o mais recente de
 * cada tipo. Com `asOf`, discos que ainda não saíram (data no futuro) não contam.
 */
export function pickFallbackCover(
  releases: Array<{
    coverPath: string | null;
    type: ReleaseType;
    releaseDate: Date;
  }>,
  asOf?: Date,
): string | null {
  const sorted = releases
    .filter(
      (release) =>
        release.coverPath &&
        (!asOf || release.releaseDate.getTime() <= asOf.getTime()),
    )
    .sort(
      (a, b) =>
        COVER_RANK[a.type] - COVER_RANK[b.type] ||
        b.releaseDate.getTime() - a.releaseDate.getTime(),
    );
  return sorted[0]?.coverPath ?? null;
}

/**
 * `coverPath` é a capa de um disco da banda (veja `pickFallbackCover`). Em `photo` (padrão, página da
 * banda e admin), a foto cadastrada ganha e a capa só entra se não houver foto. Em `cover` (listas e
 * cards), a capa do último álbum ganha e a foto só aparece se a banda não tiver nenhum disco com capa.
 */
export function toArtistSummary(
  artist: ArtistWithGenres,
  toImageSet: ToImageSet,
  coverPath: string | null = null,
  prefer: 'photo' | 'cover' = 'photo',
): ArtistSummary {
  const own = toImageSet(artist.imagePath);
  const cover = toImageSet(coverPath);
  const image = prefer === 'cover' ? (cover ?? own) : (own ?? cover);
  const fromRelease = prefer === 'cover' ? cover !== null : own === null && image !== null;
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    type: artist.type,
    country: artist.country,
    image,
    imageFromRelease: fromRelease,
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
  rating: RatingSummary,
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
    rating,
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
  ratings: RatingsByRelease,
): ArtistDetail {
  const ownReleases = releases.filter((release) =>
    release.artists.some(
      (entry) => entry.artist.id === artist.id && entry.role === 'PRIMARY',
    ),
  );
  return {
    ...toArtistSummary(
      artist,
      toImageSet,
      pickFallbackCover(ownReleases, new Date()),
    ),
    imageCredit: artist.imagePath ? parseImageCredit(artist.imageCredit) : null,
    bio: artist.bio,
    sources: parseSources(artist.sources),
    facts: parseFacts(artist.facts),
    city: artist.city,
    formedYear: artist.formedYear,
    disbandedYear: artist.disbandedYear,
    releases: releases.map((release) =>
      toReleaseSummary(release, toImageSet, ratingOf(ratings, release.id)),
    ),
  };
}

export function toReleaseDetail(
  release: ReleaseWithArtists & { tracks: Track[] },
  toImageSet: ToImageSet,
  rating: RatingSummary,
): ReleaseDetail {
  const durations = release.tracks
    .map((track) => track.durationMs)
    .filter((duration): duration is number => duration !== null);

  return {
    ...toReleaseSummary(release, toImageSet, rating),
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

/**
 * O campo `sources` é JSON no banco. Se alguém o alterou por fora da API, itens fora do
 * formato esperado (ou com link que não seja http/https) são descartados em vez de
 * quebrar a página ou virar um link perigoso.
 */
export function parseSources(value: unknown): Source[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is Source =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Source).name === 'string' &&
      typeof (item as Source).url === 'string' &&
      /^https?:\/\//i.test((item as Source).url),
  );
}
