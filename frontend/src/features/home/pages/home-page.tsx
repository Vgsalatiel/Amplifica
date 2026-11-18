import { ArtistCard } from '../../../components/catalog/artist-card'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { Container } from '../../../components/layout/container'
import { ShowScheduleRow } from '../../../components/shows/show-schedule-row'
import { ShowTicker } from '../../../components/shows/show-ticker'
import { GenreTag } from '../../../components/ui/genre-tag'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useArtistList, useGenreTree, useReleaseList } from '../../catalog/hooks/use-catalog'
import { useShowList } from '../../shows/hooks/use-shows'
import { NowPlaying, NowPlayingPlaceholder } from '../components/now-playing'
import { useClipList } from '../../clips/hooks/use-clips'
import { CLIPS } from '../lib/clips'
import { fromApi, fromConstants } from '../lib/playlist'

/** Página inicial: o "Agora na tela", a cena brasileira, a grade de shows e a porta de entrada do catálogo. */
export function HomePage() {
  const shows = useShowList({ limit: 4 })
  const releases = useReleaseList({ limit: 8 })
  const brazil = useArtistList({ country: 'BR', sort: 'newest', limit: 4 })
  const genres = useGenreTree()
  const clips = useClipList()
  // A playlist vem da API; enquanto ela falha ou está vazia, vale a lista reserva de clips.ts.
  const playlist = clips.data && clips.data.length > 0 ? fromApi(clips.data) : fromConstants(CLIPS)

  return (
    <>
      <ShowTicker shows={shows.data?.items.slice(0, 3) ?? []} label="Na agenda" />
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
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {brazil.data.items.map((artist) => (
                <li key={artist.id}>
                  <ArtistCard artist={artist} />
                </li>
              ))}
            </ul>
            <p className="mt-8">
              <TextLink to="/cena-br">Ver todas as bandas brasileiras</TextLink>
            </p>
          </section>
        )}

        {shows.data && shows.data.items.length > 0 && (
          <section className="mt-20" aria-labelledby="shows-titulo">
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
