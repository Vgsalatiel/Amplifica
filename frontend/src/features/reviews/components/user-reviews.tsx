import { useState } from 'react'
import { Link } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { Pagination } from '../../../components/ui/pagination'
import { RatingMeter } from '../../../components/ui/rating-meter'
import { TextLink } from '../../../components/ui/text-link'
import { accentStyle } from '../../../lib/accent'
import { formatReviewDate } from '../../../lib/format-date'
import { useUserReviews } from '../hooks/use-reviews'

interface UserReviewsProps {
  username: string
  displayName: string
  isOwnProfile: boolean
}

/** Discos que a pessoa avaliou, no perfil dela. Cada item usa a cor da capa do disco. */
export function UserReviews({ username, displayName, isOwnProfile }: UserReviewsProps) {
  const [page, setPage] = useState(1)
  const reviews = useUserReviews(username, page)

  if (reviews.isPending) {
    return <p className="mt-6 text-muted">Carregando avaliações…</p>
  }
  if (reviews.isError) {
    return (
      <p role="alert" className="mt-6 text-danger">
        Não foi possível carregar as avaliações.{' '}
        <button type="button" onClick={() => void reviews.refetch()} className="cursor-pointer font-semibold underline underline-offset-4">
          Tentar de novo
        </button>
      </p>
    )
  }
  if (reviews.data.items.length === 0) {
    return (
      <p className="mt-6 max-w-2xl text-muted">
        {isOwnProfile ? (
          <>
            Você ainda não avaliou nenhum disco. <TextLink to="/artistas">Escolha um artista</TextLink> e dê sua primeira nota.
          </>
        ) : (
          `${displayName} ainda não avaliou nenhum disco.`
        )}
      </p>
    )
  }

  return (
    <>
      <ul className="mt-6">
        {reviews.data.items.map((review) => {
          const { release } = review
          return (
            <li
              key={review.id}
              style={accentStyle(release.accentColor)}
              className="grid grid-cols-[5rem_minmax(0,1fr)] gap-5 border-t border-rule py-6 first:border-t-0 first:pt-0 md:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <Link to={`/lancamentos/${release.slug}`} aria-label={`Abrir ${release.title}`} tabIndex={-1}>
                <Cover title={release.title} image={release.cover} />
              </Link>
              <div>
                <h3 className="font-display text-2xl leading-tight">
                  <Link to={`/lancamentos/${release.slug}`} className="underline decoration-1 underline-offset-4 hover:text-accent">
                    {release.title}
                  </Link>
                </h3>
                <p className="text-muted">{release.artists.map((artist) => artist.name).join(', ')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <RatingMeter value={review.rating} size="sm" />
                  <p className="font-display text-xl leading-none">{review.rating}/10</p>
                </div>
                {review.body && <p className="mt-3 max-w-2xl font-serif text-lg whitespace-pre-line break-words">{review.body}</p>}
                <p className="mt-2 text-sm text-muted">
                  {formatReviewDate(review.createdAt)}
                  {review.edited && ', editada'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <Pagination page={page} totalPages={reviews.data.meta.totalPages} onChange={setPage} />
    </>
  )
}
