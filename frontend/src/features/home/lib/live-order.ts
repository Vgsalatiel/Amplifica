/**
 * Junta a ordem que a tela já mostra com a lista nova da API, sem mexer no que já foi ajeitado.
 * Quem sumiu sai; quem é novo (um pedido aprovado enquanto a pessoa assistia) entra logo depois do
 * clipe que está tocando, na ordem da API (o mais novo primeiro). Se a lista mudou por completo,
 * vale a da API.
 */
export function mergeOrder(previous: string[], incoming: string[], currentId: string | undefined): string[] {
  if (previous.length === 0) {
    return incoming
  }
  const incomingSet = new Set(incoming)
  const kept = previous.filter((id) => incomingSet.has(id))
  if (kept.length === 0) {
    return incoming
  }
  const known = new Set(previous)
  const added = incoming.filter((id) => !known.has(id))
  const merged =
    added.length === 0
      ? kept
      : (() => {
          const at = currentId ? kept.indexOf(currentId) + 1 : 0
          return [...kept.slice(0, at), ...added, ...kept.slice(at)]
        })()
  return merged.length === previous.length && merged.every((id, index) => id === previous[index]) ? previous : merged
}
