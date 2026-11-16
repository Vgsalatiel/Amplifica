import { ShowRow } from '../../../components/shows/show-row'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { useShowList } from '../hooks/use-shows'

/**
 * "Próximos shows" na página de uma banda do catálogo. Some quando não há shows (e quando a lista
 * não carrega): é um complemento da página, que nunca deve quebrá-la.
 */
export function UpcomingShows({ artistSlug }: { artistSlug: string }) {
  const shows = useShowList({ artist: artistSlug, limit: 10 })
  const items = shows.data?.items ?? []

  if (items.length === 0) {
    return null
  }
  return (
    <section className="mt-16 border-t border-rule pt-12" aria-labelledby="shows-titulo">
      <SectionHeading as="h2">
        <span id="shows-titulo">Próximos shows</span>
      </SectionHeading>
      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {items.map((show) => (
          <li key={show.id}>
            <ShowRow show={show} />
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <TextLink to="/shows">Ver a agenda completa</TextLink>
      </p>
    </section>
  )
}
