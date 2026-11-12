import type { ArtistType, ReleaseType } from '../types/api'

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
