import type { ArtistInput, ReleaseInput } from '../../catalog/api/catalog-api'
import type { FieldErrors } from '../../../lib/form-errors'
import type {
  ArtistDetail,
  ArtistType,
  ReleaseArtistRole,
  ReleaseDetail,
  ReleaseType,
} from '../../../types/api'
import { formatDuration, parseDuration } from './duration'

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  ALBUM: 'Álbum',
  EP: 'EP',
  SINGLE: 'Single',
  LIVE: 'Ao vivo',
  COMPILATION: 'Coletânea',
}

export const ARTIST_TYPE_LABELS: Record<ArtistType, string> = {
  BAND: 'Banda',
  SOLO: 'Artista solo',
}

export type Built<T> = { payload: T } | { errors: FieldErrors }

// ---------------------------------------------------------------------------
// Artista
// ---------------------------------------------------------------------------

export interface ArtistFormValues {
  name: string
  slug: string
  type: ArtistType
  bio: string
  country: string
  city: string
  formedYear: string
  disbandedYear: string
  genreIds: string[]
}

export function artistToValues(artist?: ArtistDetail): ArtistFormValues {
  return {
    name: artist?.name ?? '',
    slug: artist?.slug ?? '',
    type: artist?.type ?? 'BAND',
    bio: artist?.bio ?? '',
    country: artist?.country ?? '',
    city: artist?.city ?? '',
    formedYear: artist?.formedYear?.toString() ?? '',
    disbandedYear: artist?.disbandedYear?.toString() ?? '',
    genreIds: artist?.genres.map((genre) => genre.id) ?? [],
  }
}

function parseYear(text: string): number | null | 'invalid' {
  const value = text.trim()
  if (value === '') {
    return null
  }
  return /^\d{4}$/.test(value) ? Number(value) : 'invalid'
}

/**
 * Converte o que está nos campos no que a API espera: números de verdade, vazio como `null`.
 * Só aponta o que a API não conseguiria entender (um ano que não é número); as regras do
 * negócio (país com duas letras, ano de encerramento depois do de formação) ficam com a API.
 */
export function buildArtistPayload(values: ArtistFormValues): Built<ArtistInput> {
  const errors: FieldErrors = {}
  const formedYear = parseYear(values.formedYear)
  const disbandedYear = parseYear(values.disbandedYear)

  if (formedYear === 'invalid') {
    errors.formedYear = 'Digite o ano com quatro dígitos.'
  }
  if (disbandedYear === 'invalid') {
    errors.disbandedYear = 'Digite o ano com quatro dígitos.'
  }
  if (formedYear === 'invalid' || disbandedYear === 'invalid') {
    return { errors }
  }

  const slug = values.slug.trim()
  return {
    payload: {
      name: values.name.trim(),
      ...(slug && { slug }),
      type: values.type,
      bio: values.bio,
      country: values.country.trim() === '' ? null : values.country.trim(),
      city: values.city,
      formedYear,
      disbandedYear,
      genreIds: values.genreIds,
    },
  }
}

// ---------------------------------------------------------------------------
// Lançamento
// ---------------------------------------------------------------------------

export interface TrackValues {
  /** Identifica a linha na tela enquanto a pessoa edita; não vai para a API. */
  key: string
  discNumber: string
  position: string
  title: string
  /** "3:45". */
  duration: string
}

export interface ReleaseArtistValues {
  artistId: string
  name: string
  role: ReleaseArtistRole
}

export interface ReleaseFormValues {
  title: string
  slug: string
  type: ReleaseType
  releaseDate: string
  description: string
  youtube: string
  artists: ReleaseArtistValues[]
  tracks: TrackValues[]
}

let trackCounter = 0
export function newTrackKey(): string {
  trackCounter += 1
  return `track-${trackCounter}`
}

export function releaseToValues(release?: ReleaseDetail): ReleaseFormValues {
  return {
    title: release?.title ?? '',
    slug: release?.slug ?? '',
    type: release?.type ?? 'ALBUM',
    releaseDate: release?.releaseDate ?? '',
    description: release?.description ?? '',
    youtube: release?.youtubeVideoId ? `https://youtu.be/${release.youtubeVideoId}` : '',
    artists:
      release?.artists.map((artist) => ({ artistId: artist.id, name: artist.name, role: artist.role })) ?? [],
    tracks:
      release?.tracks.map((track) => ({
        key: newTrackKey(),
        discNumber: String(track.discNumber),
        position: String(track.position),
        title: track.title,
        duration: track.durationMs === null ? '' : formatDuration(track.durationMs),
      })) ?? [],
  }
}

/** Próxima faixa do disco: a posição seguinte à maior que já existe nele. */
export function nextTrack(tracks: TrackValues[]): TrackValues {
  const last = tracks.at(-1)
  const disc = last?.discNumber || '1'
  const positions = tracks
    .filter((track) => (track.discNumber || '1') === disc)
    .map((track) => Number(track.position))
    .filter((position) => Number.isInteger(position))
  return {
    key: newTrackKey(),
    discNumber: disc,
    position: String(Math.max(0, ...positions) + 1),
    title: '',
    duration: '',
  }
}

export function buildReleasePayload(values: ReleaseFormValues): Built<ReleaseInput> {
  const errors: FieldErrors = {}

  if (values.artists.length === 0) {
    errors.artists = 'Escolha ao menos um artista.'
  }

  const tracks: ReleaseInput['tracks'] = []
  values.tracks.forEach((track, index) => {
    const position = Number(track.position)
    const discNumber = Number(track.discNumber || '1')
    const duration = parseDuration(track.duration)

    if (!Number.isInteger(position) || position < 1) {
      errors[`tracks.${index}.position`] = 'Informe o número da faixa.'
    }
    if (!Number.isInteger(discNumber) || discNumber < 1) {
      errors[`tracks.${index}.discNumber`] = 'Informe o disco.'
    }
    if (!duration.ok) {
      errors[`tracks.${index}.durationMs`] = 'Use minutos e segundos, como 3:45.'
    }
    if (track.title.trim() === '') {
      errors[`tracks.${index}.title`] = 'Digite o título da faixa.'
    }

    tracks.push({
      title: track.title.trim(),
      discNumber,
      position,
      durationMs: duration.ok ? duration.ms : null,
    })
  })

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const slug = values.slug.trim()
  return {
    payload: {
      title: values.title.trim(),
      ...(slug && { slug }),
      type: values.type,
      releaseDate: values.releaseDate.trim(),
      description: values.description,
      youtube: values.youtube.trim(),
      artists: values.artists.map(({ artistId, role }) => ({ artistId, role })),
      tracks,
    },
  }
}
