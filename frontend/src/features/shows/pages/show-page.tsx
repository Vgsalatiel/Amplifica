import { Link, useParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { GenreTag } from '../../../components/ui/genre-tag'
import { PageLoading, PageMessage } from '../../../components/ui/page-state'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { formatShortDate, formatShowHour, showDay, todayInBrazil } from '../../../lib/format-date'
import { ApiError } from '../../../lib/http'
import { SHOW_STATUS_LABELS } from '../../../lib/labels'
import { ShowAttendance } from '../../attendance/components/show-attendance'
import { useShow } from '../hooks/use-shows'

const isSafeLink = (url: string) => /^https?:\/\//i.test(url)

/** A página de um show, em /shows/:slug: o que, quando, onde e quem vai. */
export function ShowPage() {
  const { slug = '' } = useParams()
  const query = useShow(slug)
  const show = query.data

  const bands = show?.acts.map((act) => act.name).join(', ') ?? ''
  const title = show ? (show.name && show.acts.length !== 1 ? show.name : bands) : null
  useDocumentTitle(title)

  if (query.isPending) {
    return <PageLoading what="o show" />
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return notFound ? (
      <PageMessage
        title="Esse show não existe"
        message="O endereço pode estar errado, ou o show foi removido da agenda."
        backTo={{ to: '/shows', label: 'Ver a agenda' }}
      />
    ) : (
      <PageMessage
        title="Não foi possível carregar o show"
        message="O servidor não respondeu. Se ele estava hibernando, tente de novo em instantes."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const data = show!
  const when = showDay(data.date)
  const hour = formatShowHour(data.startTime)
  const ticketUrl = data.ticketUrl && isSafeLink(data.ticketUrl) ? data.ticketUrl : null
  const open = data.status !== 'CANCELLED' && data.date >= todayInBrazil()
  const subtitle = data.name && data.acts.length === 1 ? data.name : null

  return (
    <Container className="pt-8 md:pt-12">
      <Link to="/shows" className="text-sm underline underline-offset-4 hover:text-accent">
        Voltar para a agenda
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:gap-16">
        <div>
          <h1 className="font-display text-5xl leading-none font-normal text-balance md:text-7xl">{title}</h1>
          {subtitle && <p className="mt-3 text-xl">{subtitle}</p>}

          <p className="mt-6 text-2xl">
            <time dateTime={data.date}>
              {when.weekday}, {when.day} de {when.month} de {when.year}
            </time>
            {hour && <span className="text-accent"> às {hour}</span>}
          </p>
          <p className="mt-1 text-xl text-muted">
            {data.venue}, {data.city}/{data.state}
          </p>

          {data.status !== 'CONFIRMED' && (
            <p className="mt-4 inline-block border border-ink px-2 py-0.5 font-semibold">
              {SHOW_STATUS_LABELS[data.status]}
            </p>
          )}

          {data.name && data.acts.length > 1 && (
            <div className="mt-8">
              <h2 className="font-display text-2xl leading-none">Quem toca</h2>
              <ul className="mt-3 flex flex-col gap-1 text-lg">
                {data.acts.map((act) => (
                  <li key={act.position}>
                    {act.artist ? (
                      <Link
                        to={`/artistas/${act.artist.slug}`}
                        className="underline underline-offset-4 hover:text-accent"
                      >
                        {act.name}
                      </Link>
                    ) : (
                      act.name
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.acts.length === 1 && data.acts[0]?.artist && (
            <p className="mt-6">
              <Link
                to={`/artistas/${data.acts[0].artist.slug}`}
                className="underline underline-offset-4 hover:text-accent"
              >
                Ver {data.acts[0].name} no catálogo
              </Link>
            </p>
          )}

          {data.genres.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Gêneros">
              {data.genres.map((genre) => (
                <li key={genre.id}>
                  <GenreTag name={genre.name} to={`/generos/${genre.slug}`} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {ticketUrl && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 font-extrabold text-on-accent transition-colors hover:bg-accent-hover"
              >
                Comprar ingresso
                <span className="sr-only"> (no site do vendedor, abre em outra aba)</span>
              </a>
            )}
            {data.organizerName && (
              <p className="text-muted">
                Organização:{' '}
                {data.organizerUrl && isSafeLink(data.organizerUrl) ? (
                  <a
                    href={data.organizerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-accent"
                  >
                    {data.organizerName}
                    <span className="sr-only"> (abre em outra aba)</span>
                  </a>
                ) : (
                  data.organizerName
                )}
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Conferido em {formatShortDate(data.verifiedAt.slice(0, 10))}</p>
        </div>

        {data.poster && (
          <a
            href={data.poster.large}
            target="_blank"
            rel="noopener noreferrer"
            className="block self-start border border-rule transition-colors hover:border-accent"
          >
            <img src={data.poster.large} alt={`Pôster de ${title}`} className="w-full" />
            <span className="sr-only">(abre em outra aba)</span>
          </a>
        )}
      </div>

      <div className="mt-12 max-w-2xl pb-4">
        <ShowAttendance slug={data.slug} open={open} />
      </div>
    </Container>
  )
}
