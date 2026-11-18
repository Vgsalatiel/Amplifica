import type { ReactNode } from 'react'
import { Container } from '../../../components/layout/container'
import { useDocumentTitle } from '../../../hooks/use-document-title'

export const LEGAL_UPDATED = '18 de novembro de 2026'

/** Moldura das páginas de texto (termos, privacidade, segurança): título, aviso de rascunho e o texto. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle(title)
  return (
    <Container className="pt-10 pb-6 md:pt-16">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-7xl">{title}</h1>
      <p className="mt-4 text-muted">Atualizado em {LEGAL_UPDATED}.</p>
      <p role="note" className="mt-6 max-w-2xl border-l-4 border-badge bg-surface-raised px-4 py-3 text-sm">
        Este texto é um rascunho escrito em linguagem simples e ainda não passou por revisão jurídica. Pode mudar antes
        da versão final.
      </p>
      <div className="mt-10 flex max-w-2xl flex-col gap-10 text-lg leading-relaxed">{children}</div>
    </Container>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-3xl leading-tight font-normal">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}
