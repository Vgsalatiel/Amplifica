import { useState } from 'react'
import { Link } from 'react-router'
import { Pagination } from '../../../components/ui/pagination'
import { DeleteButton } from '../../../components/ui/delete-button'
import { RatingMeter } from '../../../components/ui/rating-meter'
import { SectionHeading } from '../../../components/ui/section-heading'
import { formatReviewDate } from '../../../lib/format-date'
import { useSession } from '../../auth/hooks/use-session'
import type { Review } from '../../../types/api'
import { useDeleteReview, useReviews } from '../hooks/use-reviews'

function ReviewItem({ review, canModerate }: { review: Review; canModerate: boolean }) {
  const remove = useDeleteReview()
  const { author } = review

  return (
    <li className="border-t border-rule py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <RatingMeter value={review.rating} size="sm" />
        <p className="font-display text-xl leading-none">{review.rating}/10</p>
      </div>
      <p className="mt-3 text-muted">
        <Link to={`/u/${author.username}`} className="font-semibold text-ink underline underline-offset-4 hover:text-accent">
          {author.displayName}
        </Link>
        , {formatReviewDate(review.createdAt)}
        {review.edited && ', editada'}
      </p>
      <p className="mt-3 max-w-2xl font-serif text-xl whitespace-pre-line break-words">{review.body}</p>
      {canModerate && (
        <div className="mt-3">
          <DeleteButton
            subject={`a avaliação de ${author.displayName}`}
            pending={remove.isPending}
            onConfirm={() => remove.mutate(review.id)}
          />
        </div>
      )}
    </li>
  )
}

/** Resenhas escritas sobre o disco, da mais recente para a mais antiga. Administradores podem remover. */
export function ReviewsSection({ slug }: { slug: string }) {
  const [page, setPage] = useState(1)
  const session = useSession()
  const reviews = useReviews(slug, page)
  const canModerate = session.status === 'authenticated' && session.user.role === 'ADMIN'

  return (
    <section aria-labelledby="resenhas-titulo" className="mt-14">
      <SectionHeading as="h2" className="mb-6">
        <span id="resenhas-titulo">Resenhas</span>
      </SectionHeading>

      {reviews.isPending ? (
        <p className="text-muted">Carregando resenhas…</p>
      ) : reviews.isError ? (
        <p role="alert" className="text-danger">
          Não foi possível carregar as resenhas.{' '}
          <button type="button" onClick={() => void reviews.refetch()} className="cursor-pointer font-semibold underline underline-offset-4">
            Tentar de novo
          </button>
        </p>
      ) : reviews.data.items.length === 0 ? (
        <p className="text-muted">Ainda não há resenhas escritas para este disco.</p>
      ) : (
        <>
          <ul>
            {reviews.data.items.map((review) => (
              <ReviewItem key={review.id} review={review} canModerate={canModerate} />
            ))}
          </ul>
          <Pagination page={page} totalPages={reviews.data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </section>
  )
}
