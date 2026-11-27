/** "agora", "há 5 min", "há 3 h", "há 2 dias" e, depois de uma semana, a data ("12 de nov."). */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000))
  if (seconds < 60) {
    return 'agora'
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `há ${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `há ${hours} h`
  }
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  }
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}
