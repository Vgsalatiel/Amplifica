import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Container } from '../components/layout/container'
import { Button } from '../components/ui/button'
import { reportError } from '../lib/monitoring'

/** Erro de carregamento de um pedaço do site (acontece depois de um deploy, com a aba velha aberta). */
const isStaleChunk = (error: unknown) =>
  error instanceof Error && /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically/i.test(error.message)

/**
 * Tela de erro de qualquer rota: em vez de uma página em branco, explica o que houve e dá o botão de
 * recarregar. O erro também vai para o Sentry, se ele estiver ligado.
 */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const stale = isStaleChunk(error)

  useEffect(() => {
    if (!notFound) {
      reportError(error)
    }
  }, [error, notFound])

  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">
        {notFound ? 'Página não encontrada' : stale ? 'O site foi atualizado' : 'Algo quebrou nesta página'}
      </h1>
      <p className="mt-6 max-w-xl text-xl">
        {notFound
          ? 'O endereço pode estar errado.'
          : stale
            ? 'Há uma versão nova do Amplifica. Recarregue a página para continuar.'
            : 'Já fomos avisados. Recarregue a página; se continuar, volte para o início.'}
      </p>
      <p className="mt-6 flex flex-wrap items-center gap-6">
        <Button type="button" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
        <a href="/" className="underline underline-offset-4 hover:text-accent">
          Voltar para o início
        </a>
      </p>
    </Container>
  )
}
