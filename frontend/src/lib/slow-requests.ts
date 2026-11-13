/**
 * Detecta quando a API está demorando: no plano gratuito do Render o servidor hiberna e leva
 * cerca de 1 minuto para acordar. Enquanto alguma chamada passar de `SLOW_AFTER_MS` sem
 * resposta, a tela mostra um aviso honesto em vez de parecer travada.
 */
export const SLOW_AFTER_MS = 5000

let slowCount = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

/** Marca o início de uma chamada. Devolve a função que a encerra (chame sempre, com sucesso ou erro). */
export function trackRequest(): () => void {
  let slow = false
  let finished = false
  const timer = setTimeout(() => {
    if (!finished) {
      slow = true
      slowCount += 1
      emit()
    }
  }, SLOW_AFTER_MS)

  return () => {
    if (finished) {
      return
    }
    finished = true
    clearTimeout(timer)
    if (slow) {
      slowCount -= 1
      emit()
    }
  }
}

export const slowRequestStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => slowCount > 0,
}
