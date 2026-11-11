import { Button } from '../../../components/ui/button'
import { ApiError } from '../../../lib/api-client'
import { useHealth } from '../hooks/use-health'

/**
 * Mostra se o caminho navegador → API → banco está funcionando.
 * O componente só exibe; a chamada HTTP e o cache ficam no hook useHealth.
 */
export function ApiStatus() {
  const health = useHealth()

  return (
    <div className="flex flex-col items-start gap-5">
      <div aria-live="polite">
        <StatusMessage health={health} />
      </div>
      <Button variant="secondary" onClick={() => void health.refetch()} disabled={health.isFetching}>
        {health.isFetching ? 'Verificando…' : 'Verificar de novo'}
      </Button>
    </div>
  )
}

function StatusMessage({ health }: { health: ReturnType<typeof useHealth> }) {
  if (health.isPending) {
    return <p className="text-muted">Verificando a API…</p>
  }

  if (health.isError) {
    const databaseDown = health.error instanceof ApiError && health.error.status === 503

    return (
      <div role="alert">
        <p className="text-lg font-semibold text-danger">
          {databaseDown ? 'API no ar, banco fora do ar' : 'API fora do ar'}
        </p>
        <p className="mt-1 text-sm text-muted">
          {databaseDown
            ? 'A API respondeu, mas não conseguiu consultar o banco.'
            : 'Não foi possível falar com a API. Se ela estava hibernando, tente de novo em instantes.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-lg font-semibold">API e banco no ar</p>
      <p className="mt-1 text-sm text-muted">
        Última resposta às {new Date(health.data.timestamp).toLocaleTimeString('pt-BR')}
      </p>
    </div>
  )
}
