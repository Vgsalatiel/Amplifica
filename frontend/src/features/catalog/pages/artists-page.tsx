import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { Select } from '../../../components/ui/select'
import { TextField } from '../../../components/ui/text-field'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { useArtistList, useGenreTree } from '../hooks/use-catalog'
import { flattenGenres } from '../lib/genre-options'

/** Lista de artistas, em /artistas, com filtro por gênero e busca pelo nome. Tudo fica na URL. */
export function ArtistsPage() {
  useDocumentTitle('Artistas')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''
  const genre = params.get('genre') ?? ''
  const [search, setSearch] = useState(q)

  const genres = useGenreTree()
  const artists = useArtistList({ page, q: q || undefined, genre: genre || undefined, limit: 24 })

  const update = (next: { q?: string; genre?: string; page?: number }) => {
    const merged = { q, genre, ...next }
    setParams({
      ...(merged.q && { q: merged.q }),
      ...(merged.genre && { genre: merged.genre }),
      ...(next.page && next.page > 1 && { page: String(next.page) }),
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    update({ q: search.trim() })
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Artistas</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">Bandas e artistas do catálogo. Escolha um gênero para filtrar, ou busque pelo nome.</p>

      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,24rem)] md:items-end">
        <Select label="Gênero" value={genre} onChange={(event) => update({ genre: event.target.value })}>
          <option value="">Todos os gêneros</option>
          {(genres.data ? flattenGenres(genres.data) : []).map((option) => (
            <option key={option.id} value={slugOf(genres.data!, option.id)}>
              {'  '.repeat(option.depth)}
              {option.name}
            </option>
          ))}
        </Select>
        <form onSubmit={submit} role="search" className="flex items-end gap-3">
          <TextField label="Buscar pelo nome" value={search} onChange={(event) => setSearch(event.target.value)} className="flex-1" />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </div>

      {artists.isPending ? (
        <p role="status" className="mt-12 text-muted">
          Carregando artistas…
        </p>
      ) : artists.isError ? (
        <div className="-mx-6 md:-mx-16">
          <PageMessage title="Não foi possível carregar os artistas" message="O servidor não respondeu. Tente de novo em instantes." onRetry={() => void artists.refetch()} />
        </div>
      ) : artists.data.items.length === 0 ? (
        <p className="mt-12 text-muted">
          {q || genre ? 'Nenhum artista encontrado com esses filtros.' : 'Nenhum artista cadastrado ainda.'}
        </p>
      ) : (
        <>
          <p aria-live="polite" className="mt-12 text-sm text-muted">
            {artists.data.meta.total} {artists.data.meta.total === 1 ? 'artista' : 'artistas'}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {artists.data.items.map((artist) => (
              <li key={artist.id}>
                <ArtistCard artist={artist} />
              </li>
            ))}
          </ul>
          <Pagination page={artists.data.meta.page} totalPages={artists.data.meta.totalPages} onChange={(next) => update({ page: next })} />
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
