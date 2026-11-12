import { Link } from 'react-router'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { Container } from '../../../components/layout/container'
import { ButtonLink } from '../../../components/ui/button-link'
import { GenreTag } from '../../../components/ui/genre-tag'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useSession } from '../../auth/hooks/use-session'
import { useGenreTree, useReleaseList } from '../../catalog/hooks/use-catalog'

/** Página inicial: o que há de novo no catálogo e a porta de entrada para os gêneros. */
export function HomePage() {
  const session = useSession()
  const releases = useReleaseList({ limit: 8 })
  const genres = useGenreTree()

  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="max-w-4xl font-display text-6xl leading-[1.06] font-normal tracking-tight md:text-8xl">
        Descubra pelo disco, não pelo algoritmo.
      </h1>
      <p className="mt-8 max-w-xl font-serif text-xl leading-normal md:text-[22px]">
        O Amplifica é um catálogo de rock e suas vertentes, do midwest emo ao metalcore, com discografias organizadas e resenhas assinadas por quem ouve.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <ButtonLink to="/artistas">Ver os artistas</ButtonLink>
        {session.status === 'anonymous' && (
          <ButtonLink to="/cadastro" variant="secondary">
            Criar conta
          </ButtonLink>
        )}
      </div>

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
