import { ApiError } from '../../../lib/api-client'
import { useHealth } from '../hooks/use-health'

/**
 * Página provisória da etapa 0: prova que o caminho navegador → API → banco funciona.
 * O componente só exibe; a chamada HTTP e o cache ficam no hook useHealth.
 */
export function StatusPage() {
  const health = useHealth()

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6">
      <header>
        <p className="font-mono text-xs tracking-widest text-tape uppercase">Etapa 0 · Fundação</p>
        <h1 className="mt-2 text-5xl font-black tracking-tight uppercase">Amplifica</h1>
      </header>

      <section aria-live="polite" className="border-t border-lead pt-6">
        <StatusMessage health={health} />
      </section>

      <button
        type="button"
        onClick={() => void health.refetch()}
        disabled={health.isFetching}
        className="self-start border border-lead px-4 py-2 font-mono text-xs tracking-widest uppercase transition-colors hover:border-paper disabled:opacity-50"
      >
        {health.isFetching ? 'Verificando…' : 'Verificar de novo'}
      </button>
    </main>
  )
}

function StatusMessage({ health }: { health: ReturnType<typeof useHealth> }) {
  if (health.isPending) {
    return <p className="text-tape">Verificando a API…</p>
  }

  if (health.isError) {
    const databaseDown = health.error instanceof ApiError && health.error.status === 503

    return (
      <div role="alert">
        <p className="text-xl font-bold text-signal">
          {databaseDown ? 'API no ar, banco fora do ar' : 'API fora do ar'}
        </p>
        <p className="mt-2 text-sm text-tape">
          {databaseDown
            ? 'A API respondeu, mas não conseguiu consultar o banco. Confira a DATABASE_URL em backend/.env.'
            : 'Não foi possível falar com a API. Confira se o backend está rodando na porta 3000.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xl font-bold">API e banco no ar</p>
      <p className="mt-2 font-mono text-sm text-tape">
        Última resposta: {new Date(health.data.timestamp).toLocaleTimeString('pt-BR')}
      </p>
    </div>
  )
}
