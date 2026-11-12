import { useParams } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { Container } from '../../../components/layout/container'
import { GenreTag } from '../../../components/ui/genre-tag'
import { PageLoading, PageMessage } from '../../../components/ui/page-state'
import { SectionHeading } from '../../../components/ui/section-heading'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { countryName } from '../../../lib/format-date'
import { ApiError } from '../../../lib/http'
import { ARTIST_TYPE_LABELS } from '../../../lib/labels'
import type { ArtistDetail } from '../../../types/api'
import { Discography } from '../components/discography'
import { useArtist } from '../hooks/use-catalog'

/** "Banda, Sheffield, Reino Unido, desde 2004" ou "Banda, 2004 a 2019". Só o que se sabe. */
function artistFacts(artist: ArtistDetail): string {
  const years =
    artist.formedYear && artist.disbandedYear
      ? `${artist.formedYear} a ${artist.disbandedYear}`
      : artist.formedYear
        ? `desde ${artist.formedYear}`
        : null
  return [ARTIST_TYPE_LABELS[artist.type], artist.city, artist.country && countryName(artist.country), years]
    .filter(Boolean)
    .join(', ')
}

/** Só links http e https viram link: defesa em profundidade, porque a API já valida. */
const isSafeLink = (url: string) => /^https?:\/\//i.test(url)

/** Página de um artista, em /artistas/:slug: história, gêneros e discografia. */
export function ArtistPage() {
  const { slug = '' } = useParams()
  const query = useArtist(slug)
  const artist = query.data

  useDocumentTitle(artist?.name)

  if (query.isPending) {
    return <PageLoading what="o artista" />
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return notFound ? (
      <PageMessage
        title="Esse artista não existe"
        message="O endereço pode estar errado, ou o artista ainda não foi cadastrado."
        backTo={{ to: '/artistas', label: 'Ver os artistas' }}
      />
    ) : (
      <PageMessage
        title="Não foi possível carregar o artista"
        message="O servidor não respondeu. Se ele estava hibernando, tente de novo em instantes."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const data = artist!
  const paragraphs = data.bio ? data.bio.split(/\n{2,}/).filter(Boolean) : []
  const sources = data.sources.filter((source) => isSafeLink(source.url))

  return (
    <Container className="pt-10 md:pt-16">
      <header className="grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
        <div>
          <h1 className="font-display text-6xl leading-[1.06] font-normal tracking-tight text-balance md:text-8xl">{data.name}</h1>
          <p className="mt-5 text-lg text-muted">{artistFacts(data)}</p>
          {data.genres.length > 0 && (
            <ul aria-label="Gêneros" className="mt-6 flex flex-wrap gap-3">
              {data.genres.map((genre) => (
                <li key={genre.id}>
                  <GenreTag name={genre.name} to={`/generos/${genre.slug}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
        {data.image && <Cover title={data.name} image={data.image} size="large" />}
      </header>

      {paragraphs.length > 0 && (
        <section className="mt-16 border-t border-rule pt-12" aria-labelledby="historia-titulo">
          <SectionHeading as="h2">
            <span id="historia-titulo">História</span>
          </SectionHeading>
          <div className="mt-8 flex max-w-2xl flex-col gap-5 font-serif text-xl leading-relaxed">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {sources.length > 0 && (
            <div className="mt-8 max-w-2xl text-sm text-muted">
              <p className="font-semibold">Fontes</p>
              <ul className="mt-2 flex flex-col gap-1">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline underline-offset-4 hover:text-accent"
                    >
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-16 border-t border-rule pt-12" aria-labelledby="discografia-titulo">
        <SectionHeading as="h2">
          <span id="discografia-titulo">Discografia</span>
        </SectionHeading>
        <div className="mt-8">
          <Discography releases={data.releases} />
        </div>
      </section>
    </Container>
  )
}
