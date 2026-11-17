import { Container } from '../../../components/layout/container'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { BrazilSceneNav } from '../components/brazil-scene-nav'
import { HISTORY_ERAS, HISTORY_SOURCES, type HistoryBand } from '../lib/brazil-history'
import { useArtistList } from '../hooks/use-catalog'

/** História da cena BR, em /cena-br/historia: do hardcore dos anos 80 ao emo e ao metalcore de hoje. */
export function BrazilHistoryPage() {
  useDocumentTitle('História da cena BR')
  // Só vira link a banda que está no catálogo (a API limita a 50 por página).
  const catalog = useArtistList({ country: 'BR', limit: 50 })
  const inCatalog = new Set(catalog.data?.items.map((artist) => artist.slug))

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">História da cena BR</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">
        Do hardcore dos anos 80 ao emo e ao metalcore de hoje, em cinco capítulos curtos. Os nomes em sublinhado levam à
        página da banda no catálogo.
      </p>
      <BrazilSceneNav />

      <ol className="mt-14 space-y-16">
        {HISTORY_ERAS.map((era) => (
          <li key={era.id}>
            <section aria-labelledby={era.id}>
              <p className="font-hand text-3xl text-accent">{era.period}</p>
              <SectionHeading as="h2" className="mt-1">
                <span id={era.id}>{era.title}</span>
              </SectionHeading>
              <div className="mt-5 max-w-2xl space-y-4 font-serif text-lg leading-relaxed">
                {era.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label={`Bandas: ${era.title}`}>
                {era.bands.map((band) => (
                  <li key={band.name}>
                    <BandName band={band} linked={band.slug !== undefined && inCatalog.has(band.slug)} />
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>

      <section className="mt-20" aria-labelledby="fontes-titulo">
        <h2 id="fontes-titulo" className="font-display text-3xl">
          Fontes
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Este texto é um resumo escrito a partir destas páginas. Para saber mais, vá direto a elas.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          {HISTORY_SOURCES.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-accent"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}

function BandName({ band, linked }: { band: HistoryBand; linked: boolean }) {
  if (linked) {
    return <TextLink to={`/artistas/${band.slug}`}>{band.name}</TextLink>
  }
  return <span className="text-muted">{band.name}</span>
}
