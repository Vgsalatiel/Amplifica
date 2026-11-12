import { Link } from 'react-router'
import { countryName } from '../../lib/format-date'
import type { ArtistSummary } from '../../types/api'
import { Cover } from './cover'

export function ArtistCard({ artist }: { artist: ArtistSummary }) {
  const details = [artist.country && countryName(artist.country), artist.genres[0]?.name].filter(Boolean)
  return (
    <Link to={`/artistas/${artist.slug}`} className="group block">
      <Cover title={artist.name} image={artist.image} className="transition-opacity group-hover:opacity-90" />
      <p className="mt-3 font-display text-2xl leading-tight group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
        {artist.name}
      </p>
      {details.length > 0 && <p className="mt-1 text-sm text-muted">{details.join(', ')}</p>}
    </Link>
  )
}
