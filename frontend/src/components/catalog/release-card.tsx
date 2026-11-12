import { Link } from 'react-router'
import { releaseYear } from '../../lib/format-date'
import type { ReleaseSummary } from '../../types/api'
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
    </Link>
  )
}
