import { Container } from '../../../components/layout/container'
import { ShowRow } from '../../../components/shows/show-row'
import { PageMessage } from '../../../components/ui/page-state'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { BrazilSceneNav } from '../../catalog/components/brazil-scene-nav'
import { useShowList } from '../hooks/use-shows'

export const EMO_TOUR_NAME = 'Emo Tour'
export const EMO_TOUR_INSTAGRAM = 'https://www.instagram.com/emotourbrasil/'

/** Emo Tour, em /emo-tour: a página que divulga eventos emo no Brasil, e os eventos dela que estão na agenda. */
export function EmoTourPage() {
  useDocumentTitle(EMO_TOUR_NAME)
  const shows = useShowList({ organizer: EMO_TOUR_NAME, limit: 50 })

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">{EMO_TOUR_NAME}</h1>
      <p className="mt-5 max-w-xl text-xl">
        Página que divulga eventos emo pelo Brasil, entre eles noites com bandas cover. Aqui ficam os eventos dela que
        entraram na agenda.
      </p>
      <p className="mt-4">
        <a
          href={EMO_TOUR_INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-accent"
        >
          @emotourbrasil no Instagram
          <span className="sr-only"> (abre em outra aba)</span>
        </a>
      </p>
      <BrazilSceneNav />

      <section className="mt-14" aria-labelledby="eventos-titulo">
        <h2 id="eventos-titulo" className="font-display text-4xl leading-none">
          Próximos eventos
        </h2>
        {shows.isPending ? (
          <p role="status" className="mt-8 text-muted">
            Carregando eventos…
          </p>
        ) : shows.isError ? (
          <div className="-mx-6 md:-mx-16">
            <PageMessage
              title="Não foi possível carregar os eventos"
              message="O servidor não respondeu. Tente de novo em instantes."
              onRetry={() => void shows.refetch()}
            />
          </div>
        ) : shows.data.items.length === 0 ? (
          <p className="mt-8 max-w-xl text-muted">
            Nenhum evento da {EMO_TOUR_NAME} na agenda por enquanto. Veja as novidades no Instagram deles, ou confira
            todos os <TextLink to="/shows?genero=emo">shows de emo</TextLink>.
          </p>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-rule border-y border-rule">
              {shows.data.items.map((show) => (
                <li key={show.id}>
                  <ShowRow show={show} />
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <TextLink to="/shows?genero=emo">Ver todos os shows de emo</TextLink>
            </p>
          </>
        )}
      </section>
    </Container>
  )
}
