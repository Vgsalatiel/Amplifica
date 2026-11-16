import { Fragment } from 'react'
import { useSearchParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { ShowRow } from '../../../components/shows/show-row'
import { PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { Select } from '../../../components/ui/select'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { STATES } from '../../../lib/states'
import { useGenreTree } from '../../catalog/hooks/use-catalog'
import { flattenGenres } from '../../catalog/lib/genre-options'
import { groupByMonth } from '../lib/group-by-month'
import { useShowList } from '../hooks/use-shows'

/** Agenda de shows, em /shows: os próximos shows no Brasil, com filtro por estado e gênero. Tudo fica na URL. */
export function ShowsPage() {
  useDocumentTitle('Shows')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const state = params.get('estado') ?? ''
  const genre = params.get('genero') ?? ''

  const genres = useGenreTree()
  const shows = useShowList({ page, state: state || undefined, genre: genre || undefined, limit: 50 })

  const update = (next: { estado?: string; genero?: string; page?: number }) => {
    const merged = { estado: state, genero: genre, ...next }
    setParams({
      ...(merged.estado && { estado: merged.estado }),
      ...(merged.genero && { genero: merged.genero }),
      ...(next.page && next.page > 1 && { page: String(next.page) }),
    })
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Shows</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">
        Shows de rock, metal, hardcore e punk marcados no Brasil. Cada show leva ao site do vendedor, e a data ao lado
        mostra quando a informação foi conferida.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)]">
        <Select label="Estado" value={state} onChange={(event) => update({ estado: event.target.value })}>
          <option value="">Todos os estados</option>
          {STATES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select label="Gênero" value={genre} onChange={(event) => update({ genero: event.target.value })}>
          <option value="">Todos os gêneros</option>
          {(genres.data ? flattenGenres(genres.data) : []).map((option) => (
            <option key={option.id} value={slugOf(genres.data!, option.id)}>
              {'  '.repeat(option.depth)}
              {option.name}
            </option>
          ))}
        </Select>
      </div>

      {shows.isPending ? (
        <p role="status" className="mt-12 text-muted">
          Carregando shows…
        </p>
      ) : shows.isError ? (
        <div className="-mx-6 md:-mx-16">
          <PageMessage
            title="Não foi possível carregar os shows"
            message="O servidor não respondeu. Tente de novo em instantes."
            onRetry={() => void shows.refetch()}
          />
        </div>
      ) : shows.data.items.length === 0 ? (
        <div className="mt-12">
          <p className="text-muted">
            {state || genre ? 'Nenhum show encontrado com esses filtros.' : 'Nenhum show marcado por enquanto.'}
          </p>
          {(state || genre) && (
            <p className="mt-4">
              <TextLink to="/shows">Ver todos os shows</TextLink>
            </p>
          )}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="mt-12 text-sm text-muted">
            {shows.data.meta.total} {shows.data.meta.total === 1 ? 'show' : 'shows'}
          </p>
          {groupByMonth(shows.data.items).map((group) => (
            <Fragment key={group.key}>
              <h2 className="mt-10 border-b border-rule pb-2 font-display text-3xl leading-none font-normal italic">
                {group.heading}
              </h2>
              <ul className="divide-y divide-rule">
                {group.shows.map((show) => (
                  <li key={show.id}>
                    <ShowRow show={show} />
                  </li>
                ))}
              </ul>
            </Fragment>
          ))}
          <Pagination
            page={shows.data.meta.page}
            totalPages={shows.data.meta.totalPages}
            onChange={(next) => update({ page: next })}
          />
          <p className="mt-12 max-w-xl text-sm text-muted">
            Datas, locais e vendas podem mudar. Confirme sempre no link do vendedor antes de comprar. Falta algum show?
            Ele ainda não foi cadastrado.
          </p>
        </>
      )}
    </Container>
  )
}

/** O filtro usa o endereço (slug) do gênero; a lista achatada traz só o id, então procura na árvore. */
function slugOf(tree: NonNullable<ReturnType<typeof useGenreTree>['data']>, id: string): string {
  for (const node of tree) {
    if (node.id === id) {
      return node.slug
    }
    const found = slugOf(node.children, id)
    if (found) {
      return found
    }
  }
  return ''
}
