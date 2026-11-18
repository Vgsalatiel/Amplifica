import { Link } from 'react-router'
import { formatShowHour, showDay } from '../../lib/format-date'
import { cn } from '../../lib/cn'
import type { Show } from '../../types/api'

const isSafeLink = (url: string) => /^https?:\/\//i.test(url)

/**
 * Uma linha da "grade de shows": o dia, a hora em destaque e o que toca, como numa programação de
 * TV. É a versão compacta do `ShowRow`, para a página inicial; `highlight` marca o próximo da fila.
 */
export function ShowScheduleRow({ show, highlight = false }: { show: Show; highlight?: boolean }) {
  const when = showDay(show.date)
  const hour = formatShowHour(show.startTime)
  const bands = show.acts.map((act) => act.name).join(', ')
  const title = show.name ?? bands
  const ticketUrl = show.ticketUrl && isSafeLink(show.ticketUrl) ? show.ticketUrl : null

  return (
    <article
      className={cn(
        'grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-b border-rule py-5 sm:grid-cols-[5.5rem_5rem_minmax(0,1fr)_auto] sm:gap-x-6',
        highlight && 'bg-surface-raised',
      )}
    >
      <time dateTime={show.date} className="font-display leading-none whitespace-nowrap sm:pl-4">
        <span className={cn('block text-3xl sm:text-4xl', highlight && 'text-accent')}>{when.day}</span>
        <span className="text-sm uppercase">{when.month.slice(0, 3)}</span>
        <span className="sr-only">{`${when.day} de ${when.month} de ${when.year}`}</span>
      </time>

      <p className="hidden font-display text-2xl sm:block">{hour ?? ''}</p>

      <div className="min-w-0">
        <h3 className="font-display text-xl leading-tight font-normal text-balance md:text-2xl">
          <Link to={`/shows/${show.slug}`} className="hover:text-accent">
            {title}
          </Link>
        </h3>
        <p className="mt-1 text-muted">
          {hour && <span className="sm:hidden">{hour}, </span>}
          {show.venue}, {show.city}/{show.state}
          {show.organizerName && <span>. Organização: {show.organizerName}</span>}
        </p>
      </div>

      <div className="col-start-2 sm:col-start-4 sm:pr-4">
        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ingressos de ${title}, no site do vendedor (abre em outra aba)`}
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-full px-5 font-extrabold transition-colors',
              highlight
                ? 'bg-accent text-on-accent hover:bg-accent-hover'
                : 'border-2 border-ink hover:border-accent hover:text-accent',
            )}
          >
            Ingressos
          </a>
        )}
      </div>
    </article>
  )
}
