import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { Select } from '../../../components/ui/select'
import { TextField } from '../../../components/ui/text-field'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { RELEASE_TYPE_LABELS } from '../../../lib/labels'
import type { ReleaseType } from '../../../types/api'
import type { ReleaseSort } from '../api/catalog-api'
import { useGenreTree, useReleaseList } from '../hooks/use-catalog'
import { flattenGenreSlugs } from '../lib/genre-options'

const SORT_LABELS: Record<ReleaseSort, string> = {
  recent: 'Mais recentes',
  rating: 'Melhor nota',
  title: 'Título, de A a Z',
}

const isType = (value: string | null): value is ReleaseType => !!value && value in RELEASE_TYPE_LABELS
const isSort = (value: string | null): value is ReleaseSort => !!value && value in SORT_LABELS
const YEAR = /^\d{4}$/

interface Filters {
  q: string
  genre: string
  type: string
  year: string
  sort: ReleaseSort
}

/**
 * Todos os lançamentos, em /lancamentos, com busca, gênero, tipo, ano e ordem. Os filtros ficam
 * na URL: copiar o endereço leva a mesma lista, e o botão voltar desfaz um filtro.
 */
export function ReleasesPage() {
  useDocumentTitle('Lançamentos')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filters: Filters = {
    q: params.get('q') ?? '',
    genre: params.get('genre') ?? '',
    type: isType(params.get('type')) ? params.get('type')! : '',
    year: YEAR.test(params.get('year') ?? '') ? params.get('year')! : '',
    sort: isSort(params.get('sort')) ? (params.get('sort') as ReleaseSort) : 'recent',
  }
  const [search, setSearch] = useState(filters.q)
  const [yearText, setYearText] = useState(filters.year)
  const [yearError, setYearError] = useState<string>()

  const genres = useGenreTree()
  const releases = useReleaseList({
    page,
    limit: 24,
    q: filters.q || undefined,
    genre: filters.genre || undefined,
    type: (filters.type || undefined) as ReleaseType | undefined,
    year: filters.year ? Number(filters.year) : undefined,
    sort: filters.sort,
  })

  const anyFilter = !!(filters.q || filters.genre || filters.type || filters.year)

  function update(next: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, ...next }
    setParams({
      ...(merged.q && { q: merged.q }),
      ...(merged.genre && { genre: merged.genre }),
      ...(merged.type && { type: merged.type }),
      ...(merged.year && { year: merged.year }),
      ...(merged.sort !== 'recent' && { sort: merged.sort }),
      ...(next.page && next.page > 1 && { page: String(next.page) }),
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const year = yearText.trim()
    if (year && (!YEAR.test(year) || Number(year) < 1900 || Number(year) > 2100)) {
      setYearError('Digite um ano com 4 dígitos, como 2013.')
      return
    }
    setYearError(undefined)
    update({ q: search.trim(), year })
  }

  function clear() {
    setSearch('')
    setYearText('')
    setYearError(undefined)
    setParams(filters.sort !== 'recent' ? { sort: filters.sort } : {})
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Lançamentos</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">
        Álbuns, EPs e outros discos do catálogo. Filtre por gênero, tipo ou ano, ou ordene pela nota.
      </p>

      <form onSubmit={submit} role="search" aria-label="Filtrar lançamentos" className="mt-10 grid gap-6 md:grid-cols-4 md:items-start">
        <TextField label="Título ou artista" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} />
        <Select label="Gênero" value={filters.genre} onChange={(event) => update({ genre: event.target.value })}>
          <option value="">Todos os gêneros</option>
          {(genres.data ? flattenGenreSlugs(genres.data) : []).map((option) => (
            <option key={option.slug} value={option.slug}>
              {'  '.repeat(option.depth)}
              {option.name}
            </option>
          ))}
        </Select>
        <Select label="Tipo" value={filters.type} onChange={(event) => update({ type: event.target.value })}>
          <option value="">Todos os tipos</option>
          {Object.entries(RELEASE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <TextField
          label="Ano"
          inputMode="numeric"
          maxLength={4}
          placeholder="Ex.: 2013"
          value={yearText}
          error={yearError}
          onChange={(event) => setYearText(event.target.value)}
        />
        <Select label="Ordenar por" value={filters.sort} onChange={(event) => update({ sort: event.target.value as ReleaseSort })}>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-6 md:col-span-3 md:self-end">
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
          {anyFilter && (
            <button type="button" onClick={clear} className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4">
              Limpar filtros
            </button>
          )}
        </div>
      </form>

      {releases.isPending ? (
        <p role="status" className="mt-12 text-muted">
          Carregando lançamentos…
        </p>
      ) : releases.isError ? (
        <div className="-mx-6 md:-mx-16">
          <PageMessage title="Não foi possível carregar os lançamentos" message="O servidor não respondeu. Tente de novo em instantes." onRetry={() => void releases.refetch()} />
        </div>
      ) : releases.data.items.length === 0 ? (
        <p className="mt-12 text-muted">
          {anyFilter ? 'Nenhum lançamento encontrado com esses filtros. Tente tirar um deles.' : 'Nenhum lançamento cadastrado ainda.'}
        </p>
      ) : (
        <>
          <p aria-live="polite" className="mt-12 text-sm text-muted">
            {releases.data.meta.total} {releases.data.meta.total === 1 ? 'lançamento' : 'lançamentos'}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {releases.data.items.map((release) => (
              <li key={release.id}>
                <ReleaseCard release={release} />
              </li>
            ))}
          </ul>
          <Pagination page={releases.data.meta.page} totalPages={releases.data.meta.totalPages} onChange={(next) => update({ page: next })} />
        </>
      )}
    </Container>
  )
}
