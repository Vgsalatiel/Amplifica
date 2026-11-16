import { monthHeading } from '../../../lib/format-date'
import type { Show } from '../../../types/api'

/** Agrupa shows (já em ordem de data) por mês, mantendo a ordem. */
export function groupByMonth(shows: Show[]): Array<{ key: string; heading: string; shows: Show[] }> {
  const groups: Array<{ key: string; heading: string; shows: Show[] }> = []
  for (const show of shows) {
    const key = show.date.slice(0, 7)
    const last = groups.at(-1)
    if (last?.key === key) {
      last.shows.push(show)
    } else {
      groups.push({ key, heading: monthHeading(show.date), shows: [show] })
    }
  }
  return groups
}
