import { Container } from '../../../components/layout/container'
import { TextLink } from '../../../components/ui/text-link'

/** Página inicial provisória: o catálogo entra a partir da etapa 3. */
export function HomePage() {
  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="max-w-4xl font-display text-6xl leading-[0.96] font-normal tracking-tight md:text-8xl">
        Descubra pelo disco, não pelo algoritmo.
      </h1>
      <p className="mt-8 max-w-xl font-serif text-xl leading-normal md:text-[22px]">
        O Amplifica é um catálogo de rock e suas vertentes, do midwest emo ao metalcore, com
        discografias organizadas e resenhas assinadas por quem ouve.
      </p>
      <p className="mt-8 text-muted">
        O catálogo ainda está em construção. Enquanto isso, veja o{' '}
        <TextLink to="/guia" className="text-ink">
          guia visual
        </TextLink>{' '}
        do projeto.
      </p>
    </Container>
  )
}
