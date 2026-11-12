import type { ReactNode } from 'react'
import { Container } from '../../../components/layout/container'

interface AuthPageProps {
  title: string
  children: ReactNode
  /** Linha abaixo do formulário, com o caminho para a outra tela (entrar ou criar conta). */
  footer: ReactNode
}

/** Moldura comum das telas de login e cadastro. */
export function AuthPage({ title, children, footer }: AuthPageProps) {
  return (
    <Container className="pt-12 md:pt-20">
      <div className="max-w-md">
        <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">{title}</h1>
        <div className="mt-10">{children}</div>
        <p className="mt-8 text-muted">{footer}</p>
      </div>
    </Container>
  )
}
