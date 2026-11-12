import { Link, useSearchParams } from 'react-router'
import { ButtonLink } from '../../../components/ui/button-link'
import { Pagination } from '../../../components/ui/pagination'
import { Select } from '../../../components/ui/select'
import type { ReleaseType } from '../../../types/api'
import { useReleaseList } from '../../catalog/hooks/use-catalog'
import { RELEASE_TYPE_LABELS } from '../lib/forms'

export function ReleasesAdminPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const type = (params.get('type') as ReleaseType | null) ?? undefined
  const releases = useReleaseList({ page, type, limit: 20 })

  return (
    <section aria-labelledby="releases-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="releases-title" className="font-display text-4xl leading-none font-normal italic">
          Lançamentos
        </h2>
        <ButtonLink to="/admin/lancamentos/novo">Novo lançamento</ButtonLink>
      </div>

      <Select
        label="Filtrar por tipo"
        value={type ?? ''}
        onChange={(event) => setParams(event.target.value ? { type: event.target.value } : {})}
        className="mt-6 max-w-xs"
      >
        <option value="">Todos</option>
        {Object.entries(RELEASE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {releases.isPending ? (
        <p className="mt-8 text-muted">Carregando lançamentos…</p>
      ) : releases.isError ? (
        <p role="alert" className="mt-8 font-medium text-danger">
          Não foi possível carregar os lançamentos.
        </p>
      ) : releases.data.items.length === 0 ? (
        <p className="mt-8 text-muted">
          {type
            ? 'Nenhum lançamento desse tipo.'
            : 'Nenhum lançamento cadastrado ainda. Cadastre um artista e depois o primeiro lançamento.'}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted" aria-live="polite">
            {releases.data.meta.total} {releases.data.meta.total === 1 ? 'lançamento' : 'lançamentos'}
          </p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {releases.data.items.map((release) => (
              <li key={release.id}>
                <Link to={`/admin/lancamentos/${release.slug}`} className="flex items-center gap-4 py-3 hover:text-accent">
                  {release.cover ? (
                    <img src={release.cover.small} alt="" className="size-14 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="size-14 bg-surface-raised" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{release.title}</span>
                    <span className="block text-sm text-muted">
                      {release.artists.map((artist) => artist.name).join(', ')}, {RELEASE_TYPE_LABELS[release.type]},{' '}
                      {release.releaseDate}
                    </span>
                  </span>
                  {release.accentColor && (
                    <span
                      role="img"
                      aria-label={`Cor da página: ${release.accentColor}`}
                      className="size-5 shrink-0 border border-rule"
                      style={{ backgroundColor: release.accentColor }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={releases.data.meta.page}
            totalPages={releases.data.meta.totalPages}
            onChange={(next) => setParams({ ...(type && { type }), page: String(next) })}
          />
        </>
      )}
    </section>
  )
}
