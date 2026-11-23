import { SectionHeading } from '../../../components/ui/section-heading'
import type { ArtistFact } from '../../../types/api'

const isSafeLink = (url: string) => /^https:\/\//i.test(url)

/** "Você sabia?": curiosidades curtas da banda, cada uma com o link da fonte de onde veio. */
export function ArtistFacts({ facts }: { facts: ArtistFact[] }) {
  const shown = facts.filter((fact) => fact.text.trim() !== '')
  if (shown.length === 0) {
    return null
  }
  return (
    <section className="mt-16 border-t border-rule pt-12" aria-labelledby="curiosidades-titulo">
      <SectionHeading as="h2">
        <span id="curiosidades-titulo">Você sabia?</span>
      </SectionHeading>
      <ul className="mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
        {shown.map((fact) => (
          <li key={fact.text} className="border-l-4 border-accent pl-5">
            <p className="text-lg leading-relaxed">{fact.text}</p>
            <p className="mt-2 text-sm text-muted">
              Fonte:{' '}
              {isSafeLink(fact.sourceUrl) ? (
                <a
                  href={fact.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-accent"
                >
                  {fact.sourceName}
                  <span className="sr-only"> (abre em outra aba)</span>
                </a>
              ) : (
                fact.sourceName
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
