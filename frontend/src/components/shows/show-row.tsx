import { Link } from 'react-router'
import { formatShortDate, showDay } from '../../lib/format-date'
import { SHOW_STATUS_LABELS } from '../../lib/labels'
import type { Show } from '../../types/api'

/** Só links http e https viram link: defesa em profundidade, porque a API já valida. */
const isSafeLink = (url: string) => /^https?:\/\//i.test(url)

/** Bandas do show; as que estão no catálogo levam à página da banda. */
function Acts({ show }: { show: Show }) {
  return (
    <>
      {show.acts.map((act, index) => (
        <span key={act.position}>
          {index > 0 && ', '}
          {act.artist ? (
            <Link to={`/artistas/${act.artist.slug}`} className="underline underline-offset-4 hover:text-accent">
              {act.name}
            </Link>
          ) : (
            act.name
          )}
        </span>
      ))}
    </>
  )
}

/**
 * Um show na agenda: a data em destaque, quem toca, onde, e o link do vendedor. Mostra também
 * quando a informação foi conferida, porque datas de show mudam.
 */
export function ShowRow({ show }: { show: Show }) {
  const when = showDay(show.date)
  const bands = show.acts.map((act) => act.name).join(', ')
  // Festival (várias bandas): o nome do evento é o título. Show de uma banda: a banda é o título e
  // o nome da turnê, quando há, vira subtítulo.
  const eventIsTitle = show.name !== null && show.acts.length > 1
  const title = eventIsTitle ? (show.name as string) : bands
  const ticketUrl = show.ticketUrl && isSafeLink(show.ticketUrl) ? show.ticketUrl : null

  return (
    <article className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-5 gap-y-4 py-6 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-x-8">
      <time dateTime={show.date} className="flex flex-col items-center border-t-2 border-ink pt-2 text-center">
        <span className="font-display text-5xl leading-none tabular-nums">{when.day}</span>
        <span className="mt-1 text-sm text-muted">
          {when.weekday}, {when.month.slice(0, 3)}
        </span>
        <span className="sr-only">{`${when.day} de ${when.month} de ${when.year}`}</span>
      </time>

      <div className="min-w-0">
        <h3 className="font-display text-2xl leading-tight font-normal text-balance md:text-3xl">
          {eventIsTitle ? show.name : <Acts show={show} />}
        </h3>
        {eventIsTitle ? (
          <p className="mt-1 font-serif text-lg">
            <Acts show={show} />
          </p>
        ) : (
          show.name && <p className="mt-1 font-serif text-lg">{show.name}</p>
        )}
        <p className="mt-2 text-muted">
          {show.venue}, {show.city}/{show.state}
        </p>
        {show.status !== 'CONFIRMED' && (
          <p className="mt-2 inline-block border border-ink px-2 py-0.5 text-sm font-semibold">
            {SHOW_STATUS_LABELS[show.status]}
          </p>
        )}
      </div>

      <div className="col-start-2 flex flex-col gap-2 sm:col-start-3 sm:items-end">
        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ingressos de ${title}, no site do vendedor (abre em outra aba)`}
            className="inline-flex h-11 items-center justify-center rounded-xs border border-rule-strong px-5 font-semibold transition-colors hover:border-accent hover:text-accent"
          >
            Ingressos
          </a>
        )}
        <p className="text-xs text-muted">Conferido em {formatShortDate(show.verifiedAt.slice(0, 10))}</p>
      </div>
    </article>
  )
}
