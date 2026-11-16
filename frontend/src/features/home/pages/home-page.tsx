import { Link } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { Container } from '../../../components/layout/container'
import { ShowRow } from '../../../components/shows/show-row'
import { ButtonLink } from '../../../components/ui/button-link'
import { GenreTag } from '../../../components/ui/genre-tag'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useSession } from '../../auth/hooks/use-session'
import { useArtistList, useGenreTree, useReleaseList } from '../../catalog/hooks/use-catalog'
import { useShowList } from '../../shows/hooks/use-shows'
import { CoverMural, MURAL_SIZE } from '../components/cover-mural'

/** Página inicial: a abertura com o mural de capas, os próximos shows e a porta de entrada do catálogo. */
export function HomePage() {
  const session = useSession()
  // Para o mural: os mais bem avaliados primeiro. Pede mais do que cabe, porque nem todo disco tem capa.
  const featured = useReleaseList({ sort: 'rating', limit: MURAL_SIZE * 2 })
  const shows = useShowList({ limit: 5 })
  const releases = useReleaseList({ limit: 8 })
  const artists = useArtistList({ limit: 8 })
  const genres = useGenreTree()

  const hasMural = (featured.data?.items ?? []).some((release) => release.cover)

  return (
    <Container className="pt-12 md:pt-20">
      <div
        className={
          hasMural
            ? 'grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]'
            : ''
        }
      >
        <div>
          <h1 className="max-w-3xl font-display text-6xl leading-[1.04] font-normal tracking-tight text-balance md:text-6xl lg:text-7xl">
            Descubra pelo disco, não pelo algoritmo.
          </h1>
          <p className="mt-8 max-w-xl font-serif text-xl leading-normal md:text-[22px]">
            O Amplifica é um catálogo de rock e suas vertentes, do midwest emo ao metalcore, com discografias
            organizadas, resenhas assinadas por quem ouve e a agenda de shows no Brasil.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink to="/artistas">Ver os artistas</ButtonLink>
            <ButtonLink to="/shows" variant="secondary">
              Ver os shows
            </ButtonLink>
            {session.status === 'anonymous' && <TextLink to="/cadastro">Criar conta</TextLink>}
          </div>
          {/* Recado à mão: só enfeite, a página inteira se explica sem ele. */}
          <p aria-hidden="true" className="mt-8 -rotate-2 font-hand text-3xl text-accent">
            ♥ ouça o disco inteiro, do começo ao fim ♥
          </p>
        </div>
        {hasMural && <CoverMural releases={featured.data!.items} />}
      </div>

      {shows.data && shows.data.items.length > 0 && (
        <section className="mt-24" aria-labelledby="shows-titulo">
          <SectionHeading as="h2">
            <span id="shows-titulo">Próximos shows</span>
          </SectionHeading>
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {shows.data.items.map((show) => (
              <li key={show.id}>
                <ShowRow show={show} />
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <TextLink to="/shows">Ver a agenda completa</TextLink>
          </p>
        </section>
      )}

      {releases.data && releases.data.items.length > 0 && (
        <section className="mt-24" aria-labelledby="recentes-titulo">
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

      {artists.data && artists.data.items.length > 0 && (
        <section className="mt-24" aria-labelledby="bandas-titulo">
          <SectionHeading as="h2">
            <span id="bandas-titulo">Bandas</span>
          </SectionHeading>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {artists.data.items.map((artist) => (
              <li key={artist.id}>
                <ArtistCard artist={artist} />
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <TextLink to="/artistas">Ver todos os artistas</TextLink>
          </p>
        </section>
      )}

      {genres.data && genres.data.length > 0 && (
        <section className="mt-24" aria-labelledby="generos-titulo">
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
            <Link to="/generos" className="underline underline-offset-4 hover:text-accent">
              Ver todos os gêneros e subgêneros
            </Link>
          </p>
        </section>
      )}
    </Container>
  )
}
