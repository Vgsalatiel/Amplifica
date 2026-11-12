const MAX_MS = 7_200_000

export type ParsedDuration = { ok: true; ms: number | null } | { ok: false }

/** Lê "3:45" ou "1:02:03". Vazio significa "sem duração". Limite de 2 horas, como na API. */
export function parseDuration(text: string): ParsedDuration {
  const value = text.trim()
  if (value === '') {
    return { ok: true, ms: null }
  }

  const parts = value.split(':')
  if ((parts.length !== 2 && parts.length !== 3) || !parts.every((part) => /^\d{1,3}$/.test(part))) {
    return { ok: false }
  }

  const [seconds, minutes, hours = 0] = parts.map(Number).reverse()
  if (seconds > 59 || (parts.length === 3 && minutes > 59)) {
    return { ok: false }
  }

  const ms = ((hours * 60 + minutes) * 60 + seconds) * 1000
  return ms > 0 && ms <= MAX_MS ? { ok: true, ms } : { ok: false }
}

/** O inverso: 207000 vira "3:27"; acima de uma hora, "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** Duração total de um disco, para o cabeçalho da página: "58 min" ou "2 h 29 min". */
export function formatTotalDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes} min`
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}
