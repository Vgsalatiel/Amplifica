import { Link } from 'react-router'
import { releaseYear } from '../../lib/format-date'
import { formatRating } from '../../lib/format-rating'
import type { ReleaseSummary } from '../../types/api'
import { RatingMeter } from '../ui/rating-meter'
import { Cover } from './cover'

interface ReleaseCardProps {
  release: ReleaseSummary
  /** Mostra os artistas abaixo do título. Na página do próprio artista, é redundante. */
  showArtists?: boolean
}

export function ReleaseCard({ release, showArtists = true }: ReleaseCardProps) {
  return (
    <Link to={`/lancamentos/${release.slug}`} className="group block">
      <Cover title={release.title} image={release.cover} className="transition-opacity group-hover:opacity-90" />
      <p className="mt-3 font-display text-xl leading-tight group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
        {release.title}
      </p>
      <p className="mt-1 text-sm text-muted">
        {showArtists && release.artists.length > 0 && `${release.artists.map((artist) => artist.name).join(', ')}, `}
        {releaseYear(release.releaseDate)}
      </p>
      {release.rating.average !== null && (
        <p className="mt-1.5 flex items-center gap-2 text-sm">
          <RatingMeter value={release.rating.average} size="sm" />
          <span aria-hidden="true" className="font-semibold">
            {formatRating(release.rating.average)}
          </span>
        </p>
      )}
    </Link>
  )
}
