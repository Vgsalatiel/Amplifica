export interface DiscovererBadge {
  label: string
  /** Quantos clipes aprovados faltam para o próximo nível, ou `null` no último. */
  next: { label: string; missing: number } | null
}

const LEVELS = [
  { min: 1, label: 'Descobridor' },
  { min: 5, label: 'Garimpeiro' },
] as const

/** O selo de quem sugeriu clipes aprovados: nível pelo total, e o que falta para o próximo. `null` sem nenhum. */
export function discovererBadge(approved: number): DiscovererBadge | null {
  const reached = [...LEVELS].reverse().find((level) => approved >= level.min)
  if (!reached) {
    return null
  }
  const upcoming = LEVELS.find((level) => level.min > approved)
  return {
    label: reached.label,
    next: upcoming ? { label: upcoming.label, missing: upcoming.min - approved } : null,
  }
}
