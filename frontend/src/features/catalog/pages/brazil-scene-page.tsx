import { useSearchParams } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { Container } from '../../../components/layout/container'
import { ShowTicker } from '../../../components/shows/show-ticker'
import { PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { useShowList } from '../../shows/hooks/use-shows'
import { BrazilSceneNav } from '../components/brazil-scene-nav'
import { FeaturedAlbums } from '../components/featured-albums'
import { BRAZIL_FEATURED_RELEASES } from '../lib/brazil-featured'
import { useArtistList } from '../hooks/use-catalog'

/** Cena BR, em /cena-br: o título com quatro discos em destaque ao lado e, abaixo, todas as bandas brasileiras do catálogo. */
export function BrazilScenePage() {
  useDocumentTitle('Cena BR')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)

  const all = useArtistList({ country: 'BR', page, limit: 24 })
  const emoTour = useShowList({ organizer: 'Emo Tour', limit: 20 })

  return (
    <>
      <ShowTicker shows={emoTour.data?.items ?? []} label="Emo Tour" animated to="/emo-tour" />
      <Container className="pt-10 md:pt-16">
        <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-8xl">Cena BR</h1>
        <p className="mt-5 max-w-xl text-xl">
          Bandas brasileiras de rock e vertentes, do emo ao metal. Os shows delas estão na{' '}
          <TextLink to="/shows">agenda</TextLink>.
        </p>
        <BrazilSceneNav />

        <FeaturedAlbums slugs={BRAZIL_FEATURED_RELEASES} />

        <section className="mt-12" aria-labelledby="todas-titulo">
          <SectionHeading as="h2">
            <span id="todas-titulo">Todas as bandas brasileiras</span>
          </SectionHeading>
          {all.isPending ? (
            <p role="status" className="mt-8 text-muted">
              Carregando bandas…
            </p>
          ) : all.isError ? (
            <div className="-mx-6 md:-mx-16">
              <PageMessage
                title="Não foi possível carregar as bandas"
                message="O servidor não respondeu. Tente de novo em instantes."
                onRetry={() => void all.refetch()}
              />
            </div>
          ) : all.data.items.length === 0 ? (
            <p className="mt-8 text-muted">Nenhuma banda brasileira cadastrada ainda.</p>
          ) : (
            <>
              <p aria-live="polite" className="mt-3 text-sm text-muted">
                {all.data.meta.total} {all.data.meta.total === 1 ? 'banda' : 'bandas'}
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
                {all.data.items.map((artist) => (
                  <li key={artist.id}>
                    <ArtistCard artist={artist} />
                  </li>
                ))}
              </ul>
              <Pagination
                page={all.data.meta.page}
                totalPages={all.data.meta.totalPages}
                onChange={(next) => setParams(next > 1 ? { page: String(next) } : {})}
              />
            </>
          )}
        </section>
      </Container>
    </>
  )
}
