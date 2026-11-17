import { useSearchParams } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { Container } from '../../../components/layout/container'
import { PageMessage } from '../../../components/ui/page-state'
import { Pagination } from '../../../components/ui/pagination'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { BrazilSceneNav } from '../components/brazil-scene-nav'
import { useArtistList } from '../hooks/use-catalog'

/** Banda formada neste ano ou depois conta como "banda nova". */
export const NEW_BAND_FROM_YEAR = 2018

/** Cena BR, em /cena-br: as bandas novas do Brasil em destaque e, abaixo, todas as bandas brasileiras do catálogo. */
export function BrazilScenePage() {
  useDocumentTitle('Cena BR')
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)

  const newBands = useArtistList({ country: 'BR', formedFrom: NEW_BAND_FROM_YEAR, sort: 'newest', limit: 8 })
  const all = useArtistList({ country: 'BR', page, limit: 24 })

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Cena BR</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">
        Bandas brasileiras de rock e vertentes, do emo ao metal. As mais novas vêm primeiro, e os shows delas estão na{' '}
        <TextLink to="/shows">agenda</TextLink>.
      </p>
      <BrazilSceneNav />

      {newBands.data && newBands.data.items.length > 0 && (
        <section className="mt-16" aria-labelledby="novas-titulo">
          <SectionHeading as="h2">
            <span id="novas-titulo">Bandas novas</span>
          </SectionHeading>
          <p className="mt-3 text-sm text-muted">Formadas de {NEW_BAND_FROM_YEAR} em diante.</p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {newBands.data.items.map((artist) => (
              <li key={artist.id}>
                <ArtistCard artist={artist} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-20" aria-labelledby="todas-titulo">
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
  )
}
