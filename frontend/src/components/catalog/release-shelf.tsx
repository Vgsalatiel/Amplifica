import type { ReactNode } from 'react'
import type { ReleaseSummary } from '../../types/api'
import { ReleaseCard } from './release-card'

interface ReleaseShelfProps {
  releases: ReleaseSummary[]
  /** Nome da prateleira para leitores de tela. */
  label: string
  /** Texto curto acima da capa de cada disco (ex.: "Faz 10 anos"). */
  badge?: (release: ReleaseSummary) => ReactNode
}

/** Prateleira de capas: uma fileira que rola para o lado (com encaixe em cada capa). */
export function ReleaseShelf({ releases, label, badge }: ReleaseShelfProps) {
  return (
    <ul
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:-mx-0 md:px-0"
    >
      {releases.map((release) => (
        <li key={release.id} className="w-40 shrink-0 snap-start md:w-44">
          {badge && (
            <p className="mb-2 w-fit bg-badge px-2.5 py-0.5 font-display text-xs text-on-accent">{badge(release)}</p>
          )}
          <ReleaseCard release={release} />
        </li>
      ))}
    </ul>
  )
}
