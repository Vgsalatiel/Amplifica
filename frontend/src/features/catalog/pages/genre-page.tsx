import { useSearchParams, useParams } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { Container } from '../../../components/layout/container'
import { GenreTag } from '../../../components/ui/genre-tag'
import { PageLoading, PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { ApiError } from '../../../lib/http'
import { useArtistList, useGenre } from '../hooks/use-catalog'

/** Um gênero, em /generos/:slug: o pai, os subgêneros e os artistas (incluindo os dos subgêneros). */
export function GenrePage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const genre = useGenre(slug)
  const artists = useArtistList({ genre: slug, page, limit: 24 })

  useDocumentTitle(genre.data?.name)

  if (genre.isPending) {
    return <PageLoading what="o gênero" />
  }
  if (genre.isError) {
    const notFound = genre.error instanceof ApiError && genre.error.status === 404
    return notFound ? (
      <PageMessage
        title="Esse gênero não existe"
        message="O endereço pode estar errado."
        backTo={{ to: '/generos', label: 'Ver todos os gêneros' }}
      />
    ) : (
      <PageMessage
        title="Não foi possível carregar o gênero"
        message="O servidor não respondeu. Tente de novo em instantes."
        onRetry={() => void genre.refetch()}
      />
    )
  }

  const data = genre.data

  return (
    <Container className="pt-10 md:pt-16">
      {data.parent && (
        <p className="text-muted">
          Subgênero de <TextLink to={`/generos/${data.parent.slug}`}>{data.parent.name}</TextLink>
        </p>
      )}
      <h1 className="mt-2 font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">{data.name}</h1>
      {data.description && <p className="mt-5 max-w-xl font-serif text-xl">{data.description}</p>}

      {data.children.length > 0 && (
        <section className="mt-8" aria-label="Subgêneros">
          <ul className="flex flex-wrap gap-3">
            {data.children.map((child) => (
              <li key={child.id}>
                <GenreTag name={child.name} to={`/generos/${child.slug}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 border-t border-rule pt-10" aria-labelledby="artistas-titulo">
        <h2 id="artistas-titulo" className="font-display text-4xl leading-none font-normal italic">
          Artistas
        </h2>
        {data.children.length > 0 && <p className="mt-3 text-sm text-muted">Inclui os artistas dos subgêneros.</p>}

        {artists.isPending ? (
          <p role="status" className="mt-8 text-muted">
            Carregando artistas…
          </p>
        ) : artists.isError ? (
          <p role="alert" className="mt-8 font-medium text-danger">
            Não foi possível carregar os artistas deste gênero.
          </p>
        ) : artists.data.items.length === 0 ? (
          <p className="mt-8 text-muted">Nenhum artista neste gênero ainda.</p>
        ) : (
          <>
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {artists.data.items.map((artist) => (
                <li key={artist.id}>
                  <ArtistCard artist={artist} />
                </li>
              ))}
            </ul>
            <Pagination
              page={artists.data.meta.page}
              totalPages={artists.data.meta.totalPages}
              onChange={(next) => setParams(next > 1 ? { page: String(next) } : {})}
            />
          </>
        )}
      </section>
    </Container>
  )
}
