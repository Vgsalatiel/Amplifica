import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ButtonLink } from '../../../components/ui/button-link'
import { Button } from '../../../components/ui/button'
import { Pagination } from '../../../components/ui/pagination'
import { TextField } from '../../../components/ui/text-field'
import { useArtistList } from '../../catalog/hooks/use-catalog'
import { ARTIST_TYPE_LABELS } from '../lib/forms'

/** Lista de artistas, com busca por nome. A busca e a página ficam na URL, para o botão "voltar" funcionar. */
export function ArtistsAdminPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const artists = useArtistList({ page, q: q || undefined, limit: 20 })

  function submit(event: FormEvent) {
    event.preventDefault()
    setParams(search.trim() ? { q: search.trim() } : {})
  }

  return (
    <section aria-labelledby="artists-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="artists-title" className="font-display text-4xl leading-none font-normal italic">
          Artistas
        </h2>
        <ButtonLink to="/admin/artistas/novo">Novo artista</ButtonLink>
      </div>

      <form onSubmit={submit} role="search" className="mt-6 flex max-w-lg items-end gap-3">
        <TextField
          label="Buscar pelo nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {artists.isPending ? (
        <p className="mt-8 text-muted">Carregando artistas…</p>
      ) : artists.isError ? (
        <p role="alert" className="mt-8 font-medium text-danger">
          Não foi possível carregar os artistas.
        </p>
      ) : artists.data.items.length === 0 ? (
        <p className="mt-8 text-muted">
          {q ? `Nenhum artista com "${q}" no nome.` : 'Nenhum artista cadastrado ainda. Comece pelo botão "Novo artista".'}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted" aria-live="polite">
            {artists.data.meta.total} {artists.data.meta.total === 1 ? 'artista' : 'artistas'}
          </p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {artists.data.items.map((artist) => (
              <li key={artist.id}>
                <Link
                  to={`/admin/artistas/${artist.slug}`}
                  className="flex items-center gap-4 py-3 hover:text-accent"
                >
                  {artist.image ? (
                    <img src={artist.image.small} alt="" className="size-14 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="size-14 bg-surface-raised" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{artist.name}</span>
                    <span className="block text-sm text-muted">
                      {ARTIST_TYPE_LABELS[artist.type]}
                      {artist.country && `, ${artist.country}`}
                      {artist.genres.length > 0 && `, ${artist.genres.map((genre) => genre.name).join(', ')}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={artists.data.meta.page}
            totalPages={artists.data.meta.totalPages}
            onChange={(next) => setParams({ ...(q && { q }), page: String(next) })}
          />
        </>
      )}
    </section>
  )
}
