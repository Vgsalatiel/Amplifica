import { Container } from '../../../components/layout/container'
import { TextLink } from '../../../components/ui/text-link'

export function NotFoundPage() {
  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">
        Essa página não existe
      </h1>
      <p className="mt-6 max-w-xl font-serif text-xl">
        O endereço pode estar errado ou a página pode ter sido removida.
      </p>
      <p className="mt-6">
        <TextLink to="/">Voltar para o início</TextLink>
      </p>
    </Container>
  )
}
