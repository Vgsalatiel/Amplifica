import { Link, useSearchParams } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { cn } from '../../../lib/cn'
import { formatShortDate } from '../../../lib/format-date'
import { formMessageFrom } from '../../../lib/form-errors'
import { GROUP_PLATFORM_LABELS } from '../../../lib/labels'
import type { GroupStatus, ReviewGroup } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useDeleteGroup, useGroupsForReview, useReviewGroup } from '../../groups/hooks/use-groups'

const TABS: Array<{ status: GroupStatus; label: string }> = [
  { status: 'PENDING', label: 'Pendentes' },
  { status: 'APPROVED', label: 'Aprovados' },
  { status: 'REJECTED', label: 'Recusados' },
]

const EMPTY: Record<GroupStatus, string> = {
  PENDING: 'Nenhum grupo esperando. Quando alguém sugerir o link de um grupo, ele aparece aqui.',
  APPROVED: 'Nenhum grupo aprovado ainda.',
  REJECTED: 'Nenhum grupo recusado.',
}

/** Moderação dos grupos externos dos shows: abrir o link para conferir, aprovar, recusar ou remover. */
export function GroupsModerationPage() {
  const [params] = useSearchParams()
  const status = TABS.find((tab) => tab.status === params.get('situacao'))?.status ?? 'PENDING'
  const pending = useGroupsForReview('PENDING')
  const other = useGroupsForReview(status)
  const list = status === 'PENDING' ? pending : other

  return (
    <section aria-labelledby="groups-title">
      <h2 id="groups-title" className="font-display text-4xl leading-none font-normal italic">
        Grupos
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Links de grupos de WhatsApp, Telegram e Discord sugeridos para os shows. Abra o link antes de aprovar: o grupo
        deve ser sobre o show e não pode pedir dinheiro nem dados pessoais.
      </p>

      <nav aria-label="Situação dos grupos" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            to={tab.status === 'PENDING' ? '/moderacao/grupos' : `/moderacao/grupos?situacao=${tab.status}`}
            aria-current={tab.status === status ? 'page' : undefined}
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

      {list.isPending ? (
        <p className="mt-6 text-muted">Carregando grupos…</p>
      ) : list.isError ? (
        <p role="alert" className="mt-6 font-medium text-danger">
          Não foi possível carregar os grupos.
        </p>
      ) : list.data.length === 0 ? (
        <p className="mt-6 text-muted">{EMPTY[status]}</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {list.data.map((group) => (
            <GroupRow key={group.id} group={group} />
          ))}
        </ul>
      )}
    </section>
  )
}

function GroupRow({ group }: { group: ReviewGroup }) {
  const review = useReviewGroup()
  const remove = useDeleteGroup()
  const busy = review.isPending || remove.isPending
  const error = review.error ?? remove.error
  const showTitle = group.show.name ?? group.show.acts.join(', ')

  return (
    <li className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-xl">
        <p className="font-bold">
          {GROUP_PLATFORM_LABELS[group.platform]} · show{' '}
          <Link to={`/shows/${group.show.slug}`} className="underline underline-offset-4 hover:text-accent">
            {showTitle}
          </Link>
        </p>
        <p className="text-sm text-muted">
          {group.suggestedBy ? `sugerido por @${group.suggestedBy.username} · ` : ''}
          {formatShortDate(group.createdAt.slice(0, 10))}
        </p>
        <p className="mt-2 break-all">
          <a
            href={group.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm font-semibold underline underline-offset-4 hover:text-accent"
          >
            Abrir o convite
            <span className="sr-only"> (abre em outra aba): {GROUP_PLATFORM_LABELS[group.platform]}</span>
          </a>
          <span className="ml-2 text-sm text-muted">{group.url}</span>
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <FormAlert message={error ? formMessageFrom(error) : null} />
        <div className="flex flex-wrap items-center gap-3">
          {group.status !== 'APPROVED' && (
            <Button disabled={busy} onClick={() => review.mutate({ id: group.id, status: 'APPROVED' })} className="h-11 px-6">
              Aprovar
            </Button>
          )}
          {group.status !== 'REJECTED' && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => review.mutate({ id: group.id, status: 'REJECTED' })}
              className="h-11 px-6"
            >
              Recusar
            </Button>
          )}
        </div>
        <DeleteButton subject="esse grupo" pending={remove.isPending} onConfirm={() => remove.mutate(group.id)} />
      </div>
    </li>
  )
}
