import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../../components/ui/button'
import { TextArea } from '../../../components/ui/text-area'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { formatReviewDate } from '../../../lib/format-date'
import type { ShowComment } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useSession } from '../../auth/hooks/use-session'
import { useComments, useCreateComment, useDeleteComment, useReportComment } from '../hooks/use-comments'

const MAX_LENGTH = 500

/**
 * Mural do show: comentários simples, sem respostas, para combinar carona e trocar ideia. Links não
 * são aceitos. Quem escreveu apaga o seu; qualquer pessoa logada pode denunciar o dos outros.
 */
export function ShowComments({ slug }: { slug: string }) {
  const session = useSession()
  const comments = useComments(slug)

  return (
    <section aria-labelledby="mural-titulo" className="border-t-2 border-ink pt-6">
      <h2 id="mural-titulo" className="font-display text-3xl leading-none">
        Mural
      </h2>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Combine carona, ponto de encontro e troque ideia sobre o show. Não passe telefone, endereço ou outros dados
        pessoais, e encontre as pessoas em lugar público.
      </p>

      {session.status === 'anonymous' ? (
        <p className="mt-5">
          <TextLink to="/entrar">Entre na sua conta</TextLink> ou <TextLink to="/cadastro">crie uma</TextLink> para
          comentar.
        </p>
      ) : session.status === 'authenticated' && session.user.needsEmailVerification ? (
        <p className="mt-5">Para comentar, confirme seu e-mail. Enviamos um link para {session.user.email}.</p>
      ) : session.status === 'authenticated' ? (
        <CommentForm slug={slug} />
      ) : null}

      {comments.isPending ? (
        <p role="status" className="mt-6 text-muted">
          Carregando o mural…
        </p>
      ) : comments.isError ? (
        <p className="mt-6 text-muted">Não foi possível carregar o mural. Tente de novo em instantes.</p>
      ) : comments.data.length === 0 ? (
        <p className="mt-6 text-muted">Ninguém comentou ainda. Seja a primeira pessoa.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-y border-rule">
          {comments.data.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentForm({ slug }: { slug: string }) {
  const [body, setBody] = useState('')
  const create = useCreateComment(slug)
  const errors = fieldErrorsFrom(create.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate(body.trim(), { onSuccess: () => setBody('') })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col items-start gap-3">
      <FormAlert message={formMessageFrom(create.error)} />
      <TextArea
        label="Seu comentário"
        rows={3}
        maxLength={MAX_LENGTH}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        error={errors.body}
        hint={`${body.length}/${MAX_LENGTH}`}
        className="w-full"
      />
      <Button type="submit" disabled={create.isPending || body.trim() === ''}>
        {create.isPending ? 'Publicando…' : 'Publicar'}
      </Button>
    </form>
  )
}

function CommentItem({ comment }: { comment: ShowComment }) {
  const session = useSession()
  const remove = useDeleteComment()
  const report = useReportComment()
  const me = session.status === 'authenticated' ? session.user : null
  const mine = me?.username === comment.author.username
  const canModerate = me?.role === 'ADMIN' || me?.role === 'MODERATOR'
  const canReport = me !== null && !me.needsEmailVerification && !mine
  const error = remove.error ?? report.error

  return (
    <li className="py-4">
      <p className="text-sm text-muted">
        <Link to={`/u/${comment.author.username}`} className="font-semibold text-ink underline underline-offset-4">
          {comment.author.displayName}
        </Link>
        {' · '}
        {formatReviewDate(comment.createdAt)}
      </p>
      <p className="mt-1 break-words whitespace-pre-line">{comment.body}</p>
      <FormAlert message={error ? formMessageFrom(error) : null} />
      <div className="mt-1 flex flex-wrap items-center gap-x-5">
        {(mine || canModerate) && (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(comment.id)}
            className="min-h-11 cursor-pointer text-sm font-semibold text-danger underline underline-offset-4"
          >
            Apagar
          </button>
        )}
        {canReport &&
          (report.isSuccess ? (
            <span role="status" className="text-sm text-muted">
              Denúncia enviada. A moderação vai olhar.
            </span>
          ) : (
            <button
              type="button"
              disabled={report.isPending}
              onClick={() => report.mutate({ id: comment.id })}
              className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4 hover:text-accent"
            >
              Denunciar
            </button>
          ))}
      </div>
    </li>
  )
}
