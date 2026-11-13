import type { ShowStatus } from '../../generated/prisma/client.js';
import type { ArtistRef, GenreRef } from '../catalog/catalog.mappers.js';
import type { ImageSet } from '../images/images.service.js';
import { formatShowDate } from './show-date.js';

type ToImageSet = (path: string | null) => ImageSet | null;

export interface ShowActResponse {
  position: number;
  name: string;
  /** A banda no catálogo, quando existe; `null` para bandas de fora. */
  artist: (ArtistRef & { image: ImageSet | null }) | null;
}

export interface ShowResponse {
  id: string;
  slug: string;
  name: string | null;
  /** Dia do show, "AAAA-MM-DD". */
  date: string;
  /** Horário de início, "HH:MM", ou `null` se não foi divulgado. */
  startTime: string | null;
  venue: string;
  city: string;
  state: string;
  status: ShowStatus;
  ticketUrl: string | null;
  /** Quando a informação foi conferida pela última vez (data e hora, ISO). */
  verifiedAt: string;
  acts: ShowActResponse[];
  genres: GenreRef[];
}

/** `include` do Prisma que o mapper espera. */
export const showInclude = {
  acts: {
    orderBy: { position: 'asc' },
    include: {
      artist: { select: { id: true, name: true, slug: true, imagePath: true } },
    },
  },
  genres: { include: { genre: true }, orderBy: { genre: { name: 'asc' } } },
} as const;

interface ShowRow {
  id: string;
  slug: string;
  name: string | null;
  date: Date;
  startTime: string | null;
  venue: string;
  city: string;
  state: string;
  status: ShowStatus;
  ticketUrl: string | null;
  verifiedAt: Date;
  acts: Array<{
    position: number;
    name: string;
    artist: {
      id: string;
      name: string;
      slug: string;
      imagePath: string | null;
    } | null;
  }>;
  genres: Array<{ genre: { id: string; name: string; slug: string } }>;
}

export function toShowResponse(
  show: ShowRow,
  toImageSet: ToImageSet,
): ShowResponse {
  return {
    id: show.id,
    slug: show.slug,
    name: show.name,
    date: formatShowDate(show.date),
    startTime: show.startTime,
    venue: show.venue,
    city: show.city,
    state: show.state,
    status: show.status,
    // Se alguém gravou um link fora de http/https por fora da API, ele não sai daqui.
    ticketUrl: isWebLink(show.ticketUrl) ? show.ticketUrl : null,
    verifiedAt: show.verifiedAt.toISOString(),
    acts: show.acts.map((act) => ({
      position: act.position,
      name: act.name,
      artist: act.artist && {
        id: act.artist.id,
        name: act.artist.name,
        slug: act.artist.slug,
        image: toImageSet(act.artist.imagePath),
      },
    })),
    genres: show.genres.map(({ genre }) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
    })),
  };
}

function isWebLink(value: string | null): value is string {
  return value !== null && /^https?:\/\/[^\s]+$/i.test(value);
}
