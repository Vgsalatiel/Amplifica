import type {
  ArtistDetail,
  ArtistSummary,
  GenreDetail,
  GenreNode,
  Paginated,
  ReleaseDetail,
  ReleaseSummary,
  Review,
  UserReview,
} from '../types/api'

const cover = { large: '/files/capa-lg.webp', small: '/files/capa-sm.webp' }

export function releaseSummary(overrides: Partial<ReleaseSummary> = {}): ReleaseSummary {
  return {
    id: 'r1',
    title: 'Sempiternal',
    slug: 'bring-me-the-horizon-sempiternal',
    type: 'ALBUM',
    releaseDate: '2013-03-29',
    datePrecision: 'DAY',
    cover,
    accentColor: null,
    rating: { average: null, count: 0 },
    artists: [{ id: 'a1', name: 'Bring Me the Horizon', slug: 'bring-me-the-horizon', role: 'PRIMARY' }],
    ...overrides,
  }
}

export function releaseDetail(overrides: Partial<ReleaseDetail> = {}): ReleaseDetail {
  return {
    ...releaseSummary(),
    description: null,
    youtubeVideoId: null,
    durationMs: 3_480_000,
    tracks: [
      { id: 't1', title: 'Can You Feel My Heart', discNumber: 1, position: 1, durationMs: 228_000 },
      { id: 't2', title: 'The House of Wolves', discNumber: 1, position: 2, durationMs: 205_000 },
    ],
    ...overrides,
  }
}

export function artistSummary(overrides: Partial<ArtistSummary> = {}): ArtistSummary {
  return {
    id: 'a1',
    name: 'Bring Me the Horizon',
    slug: 'bring-me-the-horizon',
    type: 'BAND',
    country: 'GB',
    image: null,
    genres: [{ id: 'g1', name: 'Metalcore', slug: 'metalcore' }],
    ...overrides,
  }
}

export function artistDetail(overrides: Partial<ArtistDetail> = {}): ArtistDetail {
  return {
    ...artistSummary(),
    bio: 'Primeiro parágrafo da história.\n\nSegundo parágrafo da história.',
    sources: [{ name: 'MusicBrainz', url: 'https://musicbrainz.org/artist/1' }],
    city: 'Sheffield',
    formedYear: 2004,
    disbandedYear: null,
    releases: [
      releaseSummary(),
      releaseSummary({ id: 'r2', title: 'Count Your Blessings', slug: 'cyb', releaseDate: '2006-10-30', cover: null }),
      releaseSummary({ id: 'r3', title: 'Live at Wembley', slug: 'wembley', type: 'LIVE', releaseDate: '2015-06-22' }),
      releaseSummary({ id: 'r4', title: 'amo', slug: 'amo', releaseDate: '2019-01-25' }),
    ],
    ...overrides,
  }
}

export const genreNode = (
  id: string,
  name: string,
  children: GenreNode[] = [],
  parentId: string | null = null,
): GenreNode => ({ id, name, slug: id, description: null, parentId, children })

export function genreDetail(overrides: Partial<GenreDetail> = {}): GenreDetail {
  return {
    id: 'metal',
    name: 'Metal',
    slug: 'metal',
    description: null,
    parentId: null,
    parent: null,
    children: [{ id: 'metalcore', name: 'Metalcore', slug: 'metalcore' }],
    artistCount: 0,
    ...overrides,
  }
}

export const page = <T>(items: T[], extra: Partial<Paginated<T>['meta']> = {}): Paginated<T> => ({
  items,
  meta: { page: 1, limit: 24, total: items.length, totalPages: 1, ...extra },
})

export const notFound = { status: 404, body: { statusCode: 404, code: 'not_found', message: 'Não existe.' } }

export function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'rv1',
    rating: 9,
    body: 'Um disco que mudou a banda.',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    edited: false,
    author: { username: 'ana', displayName: 'Ana Souza', avatar: null },
    ...overrides,
  }
}

export function userReview(overrides: Partial<UserReview> = {}): UserReview {
  return {
    id: 'rv1',
    rating: 9,
    body: 'Um disco que mudou a banda.',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    edited: false,
    release: releaseSummary(),
    ...overrides,
  }
}
