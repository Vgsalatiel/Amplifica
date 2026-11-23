import { Cover } from '../../../components/catalog/cover'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { ReleaseShelf } from '../../../components/catalog/release-shelf'
import { Link } from 'react-router'
import { Container } from '../../../components/layout/container'
import { ShowScheduleRow } from '../../../components/shows/show-schedule-row'
import { ShowTicker } from '../../../components/shows/show-ticker'
import { GenreTag } from '../../../components/ui/genre-tag'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useGenreTree, useReleaseList } from '../../catalog/hooks/use-catalog'
import { releaseYear } from '../../../lib/format-date'
import { formatRating } from '../../../lib/format-rating'
import { useShowList } from '../../shows/hooks/use-shows'
import { NowPlaying, NowPlayingPlaceholder } from '../components/now-playing'
import { useClipList } from '../../clips/hooks/use-clips'
import { CLIPS } from '../lib/clips'
import { fromApi, fromConstants } from '../lib/playlist'

/** Idades de aniversário de lançamento que a home destaca neste mês. */
const ANNIVERSARY_YEARS = '5,10,15,20,25,30,35,40'

/** "Novembro", com a primeira letra maiúscula, para o título da seção de aniversários. */
const monthName = () => {
  const name = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Página inicial: o "Agora na tela", a cena brasileira, a grade de shows e a porta de entrada do catálogo. */
export function HomePage() {
  const shows = useShowList({ limit: 4 })
  const releases = useReleaseList({ limit: 8 })
  // Cena BR: os discos mais recentes de bandas brasileiras; a fileira muda quando chega disco novo.
  const brazil = useReleaseList({ country: 'BR', released: 'past', sort: 'recent', limit: 12 })
  const anniversaries = useReleaseList({ anniversary: ANNIVERSARY_YEARS, sort: 'recent', limit: 12 })
  const topRated = useReleaseList({ sort: 'rating', limit: 5 })
  const genres = useGenreTree()
  const clips = useClipList()
  // A playlist vem da API; enquanto ela falha ou está vazia, vale a lista reserva de clips.ts.
  const ratedReleases = (topRated.data?.items ?? []).filter((release) => release.rating.average !== null)
  const playlist = clips.data && clips.data.length > 0 ? fromApi(clips.data) : fromConstants(CLIPS)

  return (
    <>
      <ShowTicker shows={shows.data?.items.slice(0, 5) ?? []} label="Na agenda" animated to="/shows" />
      <Container className="pt-8 md:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section aria-label="Abertura">
            <h1 className="font-display text-5xl leading-[1.08] font-normal text-balance md:text-6xl">
              AUMENTE O VOLUME.{' '}
              <span className="inline-block -skew-x-6 bg-badge px-2.5 text-on-accent">ENTRE NA CENA.</span>
            </h1>
            <p className="mt-6 text-xl leading-normal text-ink/90">
              Descubra álbuns, explore discografias e acompanhe as bandas que movimentam a música alternativa. Do
              underground brasileiro às grandes cenas internacionais.
            </p>
          </section>
          {clips.isPending ? <NowPlayingPlaceholder /> : <NowPlaying items={playlist} coverClip={CLIPS[0]} />}
        </div>

        {brazil.data && brazil.data.items.length > 0 && (
          <section className="mt-20" aria-labelledby="cena-br-titulo">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <SectionHeading as="h2">
                <span id="cena-br-titulo">Cena BR</span>
              </SectionHeading>
              <TextLink to="/cena-br/historia">Ver a história da cena</TextLink>
            </div>
            <p className="mt-2 mb-6 text-muted">Os discos mais recentes das bandas brasileiras.</p>
            <ReleaseShelf releases={brazil.data.items} label="Discos da cena BR" />
            <p className="mt-4">
              <TextLink to="/cena-br">Ver todas as bandas brasileiras</TextLink>
            </p>
          </section>
        )}

        {((shows.data && shows.data.items.length > 0) || ratedReleases.length > 0) && (
          <div
            className={`mt-20 grid gap-x-12 gap-y-16 ${ratedReleases.length > 0 && shows.data && shows.data.items.length > 0 ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}
          >
            {shows.data && shows.data.items.length > 0 && (
              <section aria-labelledby="shows-titulo">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <SectionHeading as="h2">
                    <span id="shows-titulo">Grade de shows</span>
                  </SectionHeading>
                  <TextLink to="/shows">Ver a agenda completa</TextLink>
                </div>
                <div className="mt-6 border-t-2 border-ink">
                  {shows.data.items.map((show, position) => (
                    <ShowScheduleRow key={show.id} show={show} highlight={position === 0} />
                  ))}
                </div>
              </section>
            )}

            {ratedReleases.length > 0 && (
              <section aria-labelledby="avaliados-titulo">
                <SectionHeading as="h2">
                  <span id="avaliados-titulo">Mais bem avaliados</span>
                </SectionHeading>
                <ol className="mt-6 border-t-2 border-ink">
                  {ratedReleases.map((release, position) => (
                    <li key={release.id} className="border-b border-rule">
                      <Link
                        to={`/lancamentos/${release.slug}`}
                        className="group flex items-center gap-4 py-3"
                      >
                        <span aria-hidden="true" className="w-6 font-display text-2xl text-accent">
                          {position + 1}
                        </span>
                        <span className="block aspect-square w-16 shrink-0 overflow-hidden">
                          <Cover title={release.title} image={release.cover} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg leading-tight group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
                            {release.title}
                          </span>
                          <span className="block truncate text-sm text-muted">
                            {release.artists.map((artist) => artist.name).join(', ')}
                          </span>
                        </span>
                        {release.rating.average !== null && (
                          <span className="font-extrabold">{formatRating(release.rating.average)}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        {anniversaries.data && anniversaries.data.items.length > 0 && (
          <section className="mt-20" aria-labelledby="aniversarios-titulo">
            <SectionHeading as="h2">
              <span id="aniversarios-titulo">Aniversários de {monthName()}</span>
            </SectionHeading>
            <p className="mt-2 mb-6 text-muted">Discos lançados neste mês, há 5, 10, 15 anos ou mais.</p>
            <ReleaseShelf
              releases={anniversaries.data.items}
              label="Discos que fazem aniversário neste mês"
              badge={(release) => `Faz ${new Date().getFullYear() - Number(releaseYear(release.releaseDate))} anos`}
            />
          </section>
        )}

        {releases.data && releases.data.items.length > 0 && (
          <section className="mt-20" aria-labelledby="recentes-titulo">
            <SectionHeading as="h2">
              <span id="recentes-titulo">Lançamentos recentes</span>
            </SectionHeading>
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {releases.data.items.map((release) => (
                <li key={release.id}>
                  <ReleaseCard release={release} />
                </li>
              ))}
            </ul>
            <p className="mt-8">
              <TextLink to="/lancamentos">Ver todos os lançamentos</TextLink>
            </p>
          </section>
        )}

        {genres.data && genres.data.length > 0 && (
          <section className="mt-20" aria-labelledby="generos-titulo">
            <SectionHeading as="h2">
              <span id="generos-titulo">Explore por gênero</span>
            </SectionHeading>
            <ul className="mt-8 flex flex-wrap gap-3">
              {genres.data.map((genre) => (
                <li key={genre.id}>
                  <GenreTag name={genre.name} to={`/generos/${genre.slug}`} />
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <TextLink to="/generos">Ver todos os gêneros e subgêneros</TextLink>
            </p>
          </section>
        )}
      </Container>
    </>
  )
}
