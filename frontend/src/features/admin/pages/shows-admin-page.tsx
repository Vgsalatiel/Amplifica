import { Link, useSearchParams } from 'react-router'
import { ButtonLink } from '../../../components/ui/button-link'
import { Pagination } from '../../../components/ui/pagination'
import { Select } from '../../../components/ui/select'
import { formatShortDate } from '../../../lib/format-date'
import { SHOW_STATUS_LABELS } from '../../../lib/labels'
import type { ShowStatus } from '../../../types/api'
import type { ShowWhen } from '../../shows/api/shows-api'
import { useShowList } from '../../shows/hooks/use-shows'

const WHEN_LABELS: Record<ShowWhen, string> = {
  upcoming: 'Próximos',
  past: 'Já aconteceram',
  all: 'Todos',
}

export function ShowsAdminPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const when = (['upcoming', 'past', 'all'] as const).find((value) => value === params.get('when')) ?? 'upcoming'
  const status = (params.get('status') as ShowStatus | null) ?? undefined
  const shows = useShowList({ page, when, status, limit: 20 })

  const change = (next: { when?: string; status?: string }) => {
    const merged = { when, ...(status && { status }), ...next }
    setParams(Object.fromEntries(Object.entries(merged).filter(([, value]) => value)))
  }

  return (
    <section aria-labelledby="shows-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="shows-title" className="font-display text-4xl leading-none font-normal italic">
          Shows
        </h2>
        <ButtonLink to="/admin/shows/novo">Novo show</ButtonLink>
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <Select
          label="Período"
          value={when}
          onChange={(event) => change({ when: event.target.value })}
          className="w-48"
        >
          {Object.entries(WHEN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Situação"
          value={status ?? ''}
          onChange={(event) => change({ status: event.target.value })}
          className="w-56"
          hint="Os cancelados só aparecem aqui se você pedir."
        >
          <option value="">Todas, menos canceladas</option>
          {Object.entries(SHOW_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {shows.isPending ? (
        <p className="mt-8 text-muted">Carregando shows…</p>
      ) : shows.isError ? (
        <p role="alert" className="mt-8 font-medium text-danger">
          Não foi possível carregar os shows.
        </p>
      ) : shows.data.items.length === 0 ? (
        <p className="mt-8 text-muted">
          {params.size > 0 ? 'Nenhum show com esses filtros.' : 'Nenhum show cadastrado ainda. Cadastre o primeiro.'}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted" aria-live="polite">
            {shows.data.meta.total} {shows.data.meta.total === 1 ? 'show' : 'shows'}
          </p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {shows.data.items.map((show) => {
              const bands = show.acts.map((act) => act.name).join(', ')
              return (
                <li key={show.id}>
                  <Link to={`/admin/shows/${show.slug}`} className="flex items-start gap-4 py-3 hover:text-accent">
                    <span className="w-24 shrink-0 font-medium tabular-nums">{formatShortDate(show.date)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{show.name ?? bands}</span>
                      <span className="block text-sm text-muted">
                        {show.name ? `${bands}. ` : ''}
                        {show.venue}, {show.city}/{show.state}
                      </span>
                    </span>
                    {show.status !== 'CONFIRMED' && (
                      <span className="shrink-0 text-sm font-semibold">{SHOW_STATUS_LABELS[show.status]}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={shows.data.meta.page}
            totalPages={shows.data.meta.totalPages}
            onChange={(next) => setParams({ when, ...(status && { status }), page: String(next) })}
          />
        </>
      )}
    </section>
  )
}
