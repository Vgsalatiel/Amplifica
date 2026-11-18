import { Link } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { formMessageFrom } from '../../../lib/form-errors'
import { formatReviewDate } from '../../../lib/format-date'
import type { ReportedComment } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useDeleteComment, useDismissReports, useReportedComments } from '../../comments/hooks/use-comments'

/** Fila de denúncias do mural dos shows: manter o comentário (dar por visto) ou apagar. */
export function CommentsModerationPage() {
  const reported = useReportedComments()

  return (
    <section aria-labelledby="denuncias-title">
      <h2 id="denuncias-title" className="font-display text-4xl leading-none font-normal italic">
        Denúncias
        {reported.data && reported.data.length > 0 ? ` (${reported.data.length})` : ''}
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Comentários do mural dos shows que alguém denunciou. Os mais denunciados vêm primeiro. Manter tira da fila; se
        outra pessoa denunciar de novo, ele volta.
      </p>

      {reported.isPending ? (
        <p className="mt-6 text-muted">Carregando denúncias…</p>
      ) : reported.isError ? (
        <p role="alert" className="mt-6 font-medium text-danger">
          Não foi possível carregar as denúncias.
        </p>
      ) : reported.data.length === 0 ? (
        <p className="mt-6 text-muted">Nenhuma denúncia esperando. Quando alguém denunciar um comentário, ele aparece aqui.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-y border-rule">
          {reported.data.map((comment) => (
            <ReportedRow key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReportedRow({ comment }: { comment: ReportedComment }) {
  const dismiss = useDismissReports()
  const remove = useDeleteComment()
  const busy = dismiss.isPending || remove.isPending
  const showTitle = comment.show.name ?? comment.show.acts.join(', ')

  return (
    <li className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-xl">
        <p className="text-sm text-muted">
          <Link to={`/u/${comment.author.username}`} className="font-semibold text-ink underline underline-offset-4">
            @{comment.author.username}
          </Link>
          {' · '}
          {formatReviewDate(comment.createdAt)}
          {' · no show '}
          <Link to={`/shows/${comment.show.slug}`} className="underline underline-offset-4 hover:text-accent">
            {showTitle}
          </Link>
        </p>
        <p className="mt-2 break-words whitespace-pre-line">{comment.body}</p>
        <p className="mt-2 text-sm font-semibold text-danger">
          {comment.reportCount === 1 ? '1 denúncia' : `${comment.reportCount} denúncias`}
        </p>
        {comment.reasons.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {comment.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col items-start gap-3">
        <FormAlert message={dismiss.error || remove.error ? formMessageFrom(dismiss.error ?? remove.error) : null} />
        <Button variant="secondary" disabled={busy} onClick={() => dismiss.mutate(comment.id)} className="h-11 px-6">
          Manter comentário
        </Button>
        <DeleteButton
          subject="esse comentário"
          pending={remove.isPending}
          onConfirm={() => remove.mutate(comment.id)}
        />
      </div>
    </li>
  )
}
