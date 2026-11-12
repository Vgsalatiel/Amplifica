import { ReleaseCard } from '../../../components/catalog/release-card'
import type { ReleaseSummary, ReleaseType } from '../../../types/api'

/** Os grupos da discografia, na ordem em que aparecem. */
const GROUPS: Array<{ types: ReleaseType[]; title: string }> = [
  { types: ['ALBUM'], title: 'Álbuns' },
  { types: ['EP'], title: 'EPs' },
  { types: ['LIVE'], title: 'Ao vivo' },
  { types: ['COMPILATION'], title: 'Coletâneas e remixes' },
  { types: ['SINGLE'], title: 'Singles' },
]

/** Discografia agrupada por tipo, de cada grupo do lançamento mais recente ao mais antigo. */
export function Discography({ releases }: { releases: ReleaseSummary[] }) {
  if (releases.length === 0) {
    return <p className="text-muted">Nenhum lançamento cadastrado para este artista ainda.</p>
  }

  return (
    <div className="flex flex-col gap-14">
      {GROUPS.map((group) => {
        const items = releases
          .filter((release) => group.types.includes(release.type))
          // "2013" e "2013-03-29" ordenam corretamente como texto: mais recente primeiro.
          .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
        if (items.length === 0) {
          return null
        }
        return (
          <section key={group.title} aria-labelledby={`grupo-${group.types[0]}`}>
            <h3 id={`grupo-${group.types[0]}`} className="font-display text-3xl leading-none font-normal italic">
              {group.title} <span className="font-sans text-base font-normal text-muted not-italic">({items.length})</span>
            </h3>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {items.map((release) => (
                <li key={release.id}>
                  <ReleaseCard release={release} showArtists={false} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
