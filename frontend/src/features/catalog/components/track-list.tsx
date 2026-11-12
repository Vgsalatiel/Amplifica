import { formatDuration } from '../../../lib/duration'
import type { Track } from '../../../types/api'

/** Lista de faixas no estilo de encarte: número, título, pontilhado e duração. */
export function TrackList({ tracks }: { tracks: Track[] }) {
  const discs = new Map<number, Track[]>()
  for (const track of tracks) {
    discs.set(track.discNumber, [...(discs.get(track.discNumber) ?? []), track])
  }
  const multiDisc = discs.size > 1

  return (
    <div className="flex max-w-xl flex-col gap-8">
      {[...discs.entries()].map(([disc, items]) => (
        <section key={disc} aria-label={multiDisc ? `Disco ${disc}` : 'Faixas'}>
          {multiDisc && <h3 className="mb-2 text-sm font-semibold text-muted">Disco {disc}</h3>}
          <ol>
            {items.map((track) => (
              <li key={track.id} className="flex items-baseline gap-3 py-1.5">
                <span className="w-7 shrink-0 text-muted tabular-nums">{track.position}</span>
                <span className="min-w-0">{track.title}</span>
                <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-rule-strong" />
                {track.durationMs !== null && <span className="text-muted tabular-nums">{formatDuration(track.durationMs)}</span>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
