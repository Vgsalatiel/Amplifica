import { useSearchParams } from 'react-router'
import { ArtistCard } from '../../../components/catalog/artist-card'
import { ReleaseCard } from '../../../components/catalog/release-card'
import { Container } from '../../../components/layout/container'
import { Pagination } from '../../../components/ui/pagination'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { useArtistList, useReleaseList } from '../../catalog/hooks/use-catalog'

const pageOf = (value: string | null) => Math.max(1, Number(value) || 1)

/** Resultado da busca do cabeçalho, em /buscar?q=...: artistas e lançamentos, cada um com a sua paginação. */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const artistPage = pageOf(params.get('pa'))
  const releasePage = pageOf(params.get('pl'))
  useDocumentTitle(q ? `Busca por ${q}` : 'Busca')

  // Sem texto, não consulta: o campo do cabeçalho é o único jeito de buscar.
  const artists = useArtistList({ q, page: artistPage, limit: 8 }, !!q)
  const releases = useReleaseList({ q, page: releasePage, limit: 8 }, !!q)

  const go = (next: { pa?: number; pl?: number }) => {
    const pa = next.pa ?? artistPage
    const pl = next.pl ?? releasePage
    setParams({ q, ...(pa > 1 && { pa: String(pa) }), ...(pl > 1 && { pl: String(pl) }) })
  }

  if (!q) {
    return (
      <Container className="pt-10 md:pt-16">
        <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Busca</h1>
        <p className="mt-5 max-w-xl font-serif text-xl">
          Digite o nome de um artista ou de um disco na caixa de busca, no alto da página. Para explorar sem procurar, veja os{' '}
          <TextLink to="/artistas">artistas</TextLink> ou os <TextLink to="/lancamentos">lançamentos</TextLink>.
        </p>
      </Container>
    )
  }

  const loading = artists.isPending || releases.isPending
  const failed = artists.isError || releases.isError
  const nothing = !loading && !failed && artists.data!.meta.total === 0 && releases.data!.meta.total === 0

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight break-words md:text-6xl">
        Resultados para “{q}”
      </h1>

      {loading ? (
        <p role="status" className="mt-10 text-muted">
          Buscando…
        </p>
      ) : failed ? (
        <p role="alert" className="mt-10 text-danger">
          Não foi possível buscar agora.{' '}
          <button
            type="button"
            onClick={() => {
              void artists.refetch()
              void releases.refetch()
            }}
            className="cursor-pointer font-semibold underline underline-offset-4"
          >
            Tentar de novo
          </button>
        </p>
      ) : nothing ? (
        <p className="mt-10 max-w-xl font-serif text-xl">
          Nada encontrado para “{q}”. Confira a grafia (acentos e maiúsculas não importam) ou tente menos palavras. Você também pode ver os{' '}
          <TextLink to="/artistas">artistas</TextLink> ou os <TextLink to="/lancamentos">lançamentos</TextLink>.
        </p>
      ) : (
        <>
          {artists.data!.items.length > 0 && (
            <section aria-labelledby="busca-artistas" className="mt-12">
              <SectionHeading as="h2" className="mb-6">
                <span id="busca-artistas">Artistas ({artists.data!.meta.total})</span>
              </SectionHeading>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
                {artists.data!.items.map((artist) => (
                  <li key={artist.id}>
                    <ArtistCard artist={artist} />
                  </li>
                ))}
              </ul>
              <Pagination page={artists.data!.meta.page} totalPages={artists.data!.meta.totalPages} onChange={(next) => go({ pa: next })} />
            </section>
          )}
          {releases.data!.items.length > 0 && (
            <section aria-labelledby="busca-lancamentos" className="mt-12">
              <SectionHeading as="h2" className="mb-6">
                <span id="busca-lancamentos">Lançamentos ({releases.data!.meta.total})</span>
              </SectionHeading>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
                {releases.data!.items.map((release) => (
                  <li key={release.id}>
                    <ReleaseCard release={release} />
                  </li>
                ))}
              </ul>
              <Pagination page={releases.data!.meta.page} totalPages={releases.data!.meta.totalPages} onChange={(next) => go({ pl: next })} />
            </section>
          )}
        </>
      )}
    </Container>
  )
}
