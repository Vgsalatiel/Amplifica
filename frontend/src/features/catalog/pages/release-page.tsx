import { Link, useParams } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { Container } from '../../../components/layout/container'
import { PageLoading, PageMessage } from '../../../components/ui/page-state'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { accentStyle } from '../../../lib/accent'
import { formatTotalDuration } from '../../../lib/duration'
import { formatReleaseDate } from '../../../lib/format-date'
import { ApiError } from '../../../lib/http'
import { RELEASE_TYPE_LABELS } from '../../../lib/labels'
import { useRelease } from '../hooks/use-catalog'
import { ReviewsSection } from '../../reviews/components/reviews-section'
import { RatingSummaryBlock } from '../../reviews/components/rating-summary'
import { RatingPrompt } from '../components/rating-prompt'
import { TrackList } from '../components/track-list'
import { YouTubeEmbed } from '../components/youtube-embed'

/** Página de um disco, em /lancamentos/:slug. Os botões e destaques usam a cor da capa. */
export function ReleasePage() {
  const { slug = '' } = useParams()
  const query = useRelease(slug)
  const release = query.data

  useDocumentTitle(release ? `${release.title}, ${release.artists.map((artist) => artist.name).join(', ')}` : null)

  if (query.isPending) {
    return <PageLoading what="o disco" />
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404
    return notFound ? (
      <PageMessage
        title="Esse disco não existe"
        message="O endereço pode estar errado, ou o disco foi removido do catálogo."
        backTo={{ to: '/artistas', label: 'Ver os artistas' }}
      />
    ) : (
      <PageMessage
        title="Não foi possível carregar o disco"
        message="O servidor não respondeu. Se ele estava hibernando, tente de novo em instantes."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const primary = release!.artists.filter((artist) => artist.role === 'PRIMARY')
  const featured = release!.artists.filter((artist) => artist.role === 'FEATURED')
  const data = release!

  return (
    // Redefine a cor de destaque só aqui dentro: o resto do site continua no violeta.
    <div style={accentStyle(data.accentColor)}>
      <Container className="pt-8 md:pt-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] md:gap-16">
          <Cover title={data.title} image={data.cover} size="large" />

          <div>
            <p className="text-muted">
              {RELEASE_TYPE_LABELS[data.type]}, {formatReleaseDate(data.releaseDate, data.datePrecision)}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[1.06] font-normal tracking-tight text-balance md:text-7xl">
              {data.title}
            </h1>
            <p className="mt-5 font-display text-3xl leading-tight italic">
              de{' '}
              {primary.map((artist, index) => (
                <span key={artist.id}>
                  {index > 0 && ', '}
                  <Link to={`/artistas/${artist.slug}`} className="underline decoration-1 underline-offset-4 hover:text-accent">
                    {artist.name}
                  </Link>
                </span>
              ))}
            </p>
            {featured.length > 0 && (
              <p className="mt-2 text-muted">
                Com{' '}
                {featured.map((artist, index) => (
                  <span key={artist.id}>
                    {index > 0 && ', '}
                    <TextLink to={`/artistas/${artist.slug}`}>{artist.name}</TextLink>
                  </span>
                ))}
              </p>
            )}

            {data.description && <p className="mt-8 max-w-xl font-serif text-xl whitespace-pre-line">{data.description}</p>}

            <RatingSummaryBlock rating={data.rating} />

            <dl className="mt-8 grid max-w-xs grid-cols-[6rem_minmax(0,1fr)] gap-y-1.5">
              <dt className="text-muted">Faixas</dt>
              <dd>{data.tracks.length}</dd>
              {data.durationMs !== null && (
                <>
                  <dt className="text-muted">Duração</dt>
                  <dd>{formatTotalDuration(data.durationMs)}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        <div className="mt-14">
          <RatingPrompt slug={data.slug} releaseDate={data.releaseDate} />
        </div>

        <ReviewsSection slug={data.slug} />

        {data.youtubeVideoId && (
          <section className="mt-14" aria-labelledby="video-titulo">
            <SectionHeading as="h2" className="mb-6">
              <span id="video-titulo">Vídeo</span>
            </SectionHeading>
            <YouTubeEmbed videoId={data.youtubeVideoId} title={data.title} />
          </section>
        )}

        <section className="mt-14" aria-labelledby="faixas-titulo">
          <SectionHeading as="h2" className="mb-6">
            <span id="faixas-titulo">Faixas</span>
          </SectionHeading>
          {data.tracks.length > 0 ? (
            <TrackList tracks={data.tracks} />
          ) : (
            <p className="text-muted">A lista de faixas deste disco ainda não foi cadastrada.</p>
          )}
        </section>
      </Container>
    </div>
  )
}
