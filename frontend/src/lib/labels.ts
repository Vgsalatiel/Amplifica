import type { ArtistType, ReleaseType, ShowStatus } from '../types/api'

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

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  CONFIRMED: 'Confirmado',
  SOLD_OUT: 'Esgotado',
  CANCELLED: 'Cancelado',
}
