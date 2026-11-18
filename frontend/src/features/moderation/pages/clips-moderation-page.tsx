import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { cn } from '../../../lib/cn'
import { formatShortDate } from '../../../lib/format-date'
import { formMessageFrom } from '../../../lib/form-errors'
import type { ClipStatus, ReviewClip } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useClipsForReview, useDeleteClip, useReviewClip } from '../../clips/hooks/use-clips'
import { ClipArtistLink, type ArtistChoice } from '../components/clip-artist-link'

const TABS: Array<{ status: ClipStatus; label: string }> = [
  { status: 'PENDING', label: 'Pendentes' },
  { status: 'APPROVED', label: 'Aprovados' },
  { status: 'REJECTED', label: 'Recusados' },
]

const EMPTY: Record<ClipStatus, string> = {
  PENDING: 'Nenhuma sugestão esperando. Quando alguém sugerir um clipe, ele aparece aqui.',
  APPROVED: 'Nenhum clipe aprovado ainda.',
  REJECTED: 'Nenhum clipe recusado.',
}

/** Moderação dos clipes da playlist "Agora na tela": aprovar, recusar, ligar a uma banda e remover. */
export function ClipsModerationPage() {
  const [params] = useSearchParams()
  const status = TABS.find((tab) => tab.status === params.get('situacao'))?.status ?? 'PENDING'
  const [notice, setNotice] = useState('')

  // A contagem de pendentes aparece em todas as abas, então essa fila sempre é consultada.
  const pending = useClipsForReview('PENDING')
  const other = useClipsForReview(status, status !== 'PENDING')
  const list = status === 'PENDING' ? pending : other

  return (
    <section aria-labelledby="clips-title">
      <h2 id="clips-title" className="font-display text-4xl leading-none font-normal italic">
        Clipes
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Os clipes da playlist da página inicial. As sugestões das pessoas só entram depois de aprovadas aqui.
      </p>

      <nav aria-label="Situação dos clipes" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            to={tab.status === 'PENDING' ? '/moderacao/clipes' : `/moderacao/clipes?situacao=${tab.status}`}
            aria-current={tab.status === status ? 'page' : undefined}
            onClick={() => setNotice('')}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border-2 px-5 font-semibold transition-colors',
              tab.status === status
                ? 'border-accent bg-accent font-extrabold text-on-accent'
                : 'border-rule-strong hover:border-accent hover:text-accent',
            )}
          >
            {tab.label}
            {tab.status === 'PENDING' && pending.data ? ` (${pending.data.length})` : ''}
          </Link>
        ))}
      </nav>

      <p role="status" className="mt-4 min-h-6 font-medium text-accent">
        {notice}
      </p>

      {list.isPending ? (
        <p className="mt-4 text-muted">Carregando clipes…</p>
      ) : list.isError ? (
        <p role="alert" className="mt-4 font-medium text-danger">
          Não foi possível carregar os clipes.
        </p>
      ) : list.data.length === 0 ? (
        <p className="mt-4 text-muted">{EMPTY[status]}</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {list.data.map((clip) => (
            <ClipRow key={clip.id} clip={clip} onDone={setNotice} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ClipRow({ clip, onDone }: { clip: ReviewClip; onDone: (message: string) => void }) {
  const review = useReviewClip()
  const remove = useDeleteClip()
  const [artist, setArtist] = useState<ArtistChoice>(undefined)
  const busy = review.isPending || remove.isPending
  const error = review.error ?? remove.error

  function decide(next: 'APPROVED' | 'REJECTED') {
    review.mutate(
      { id: clip.id, input: { status: next, ...(artist !== undefined && { artistId: artist?.id ?? null }) } },
      { onSuccess: () => onDone(next === 'APPROVED' ? `Aprovado: ${clip.title}` : `Recusado: ${clip.title}`) },
    )
  }

  return (
    <li className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-md">
        <p className="font-bold">
          {clip.title}
          {clip.pinned && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-xs font-extrabold text-on-accent">
              fixo
            </span>
          )}
        </p>
        <p className="text-sm text-muted">
          {clip.channelName}
          {clip.suggestedBy && ` · sugerido por @${clip.suggestedBy.username}`}
          {` · ${formatShortDate(clip.createdAt.slice(0, 10))}`}
        </p>
        <p className="mt-2">
          <a
            href={`https://www.youtube.com/watch?v=${clip.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline underline-offset-4 hover:text-accent"
          >
            Abrir no YouTube
            <span className="sr-only"> (abre em outra aba): {clip.title}</span>
          </a>
        </p>
      </div>

      <ClipArtistLink current={clip.artist} value={artist} onChange={setArtist} />

      <div className="flex flex-col items-start gap-3">
        <FormAlert message={error ? formMessageFrom(error) : null} />
        <div className="flex flex-wrap items-center gap-3">
          {clip.status !== 'APPROVED' ? (
            <Button disabled={busy} onClick={() => decide('APPROVED')} className="h-11 px-6">
              Aprovar
            </Button>
          ) : (
            artist !== undefined && (
              <Button disabled={busy} onClick={() => decide('APPROVED')} className="h-11 px-6">
                Salvar banda
              </Button>
            )
          )}
          {clip.status !== 'REJECTED' && (
            <Button variant="secondary" disabled={busy} onClick={() => decide('REJECTED')} className="h-11 px-6">
              Recusar
            </Button>
          )}
        </div>
        <DeleteButton
          subject={`o clipe ${clip.title}`}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(clip.id, { onSuccess: () => onDone(`Removido: ${clip.title}`) })}
        />
      </div>
    </li>
  )
}
