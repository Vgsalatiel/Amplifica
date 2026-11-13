import { useSyncExternalStore } from 'react'
import { slowRequestStore } from '../../lib/slow-requests'
import { Container } from './container'

/**
 * Aviso de servidor acordando. Aparece só quando uma chamada passa de alguns segundos sem
 * resposta, e some sozinho quando a API volta.
 */
export function SlowApiNotice() {
  const slow = useSyncExternalStore(slowRequestStore.subscribe, slowRequestStore.getSnapshot)
  if (!slow) {
    return null
  }
  return (
    <div role="status" className="border-y border-rule bg-surface-raised">
      <Container className="py-3 text-sm">
        <p>
          <span className="font-semibold">O servidor estava em repouso e está acordando.</span> Isso pode levar até 1 minuto na primeira visita. A página
          carrega sozinha, não precisa recarregar.
        </p>
      </Container>
    </div>
  )
}
