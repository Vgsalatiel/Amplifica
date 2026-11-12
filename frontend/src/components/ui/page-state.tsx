import { Container } from '../layout/container'
import { Button } from './button'
import { TextLink } from './text-link'

export function PageLoading({ what }: { what: string }) {
  return (
    <Container className="pt-16">
      <p role="status" className="text-muted">
        Carregando {what}…
      </p>
    </Container>
  )
}

interface PageMessageProps {
  title: string
  message: string
  /** Para onde o link "voltar" leva, e com que texto. */
  backTo?: { to: string; label: string }
  onRetry?: () => void
}

/** Página inteira de aviso: cadastro que não existe, ou falha ao falar com o servidor. */
export function PageMessage({ title, message, backTo = { to: '/', label: 'Voltar para o início' }, onRetry }: PageMessageProps) {
  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">{title}</h1>
      <p role="alert" className="mt-6 max-w-xl font-serif text-xl">
        {message}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Tentar de novo
          </Button>
        )}
        <TextLink to={backTo.to}>{backTo.label}</TextLink>
      </div>
    </Container>
  )
}
