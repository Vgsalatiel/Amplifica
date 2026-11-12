import { RatingMeter } from '../../../components/ui/rating-meter'
import { formatRating } from '../../../lib/format-rating'
import type { RatingSummary } from '../../../types/api'

/** Média das notas no alto da página do disco. Sem avaliações, convida a ser a primeira pessoa. */
export function RatingSummaryBlock({ rating }: { rating: RatingSummary }) {
  if (rating.average === null) {
    return <p className="mt-8 text-muted">Ninguém avaliou este disco ainda. Seja a primeira pessoa.</p>
  }
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-display text-5xl leading-none">
          {formatRating(rating.average)}
          <span className="text-2xl text-muted"> de 10</span>
        </p>
        <RatingMeter value={rating.average} />
      </div>
      <p className="mt-2 text-muted">{rating.count === 1 ? '1 avaliação' : `${rating.count} avaliações`}</p>
    </div>
  )
}
