import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/** Moldura comum a todas as páginas: cabeçalho, conteúdo da rota e rodapé. */
export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/*
        A `key` muda a cada troca de página, o que faz o React remontar o <main> e
        reiniciar a animação de entrada. Cabeçalho e rodapé ficam fora dela e não piscam.
        `motion-safe` desliga a animação para quem pediu menos movimento no sistema.
      */}
      <main id="conteudo" key={pathname} className="flex-1 pb-24 motion-safe:animate-page-enter">
        <Outlet />
      </main>
      <SiteFooter />
      {/* Volta ao topo em páginas novas e restaura a posição ao usar "voltar". */}
      <ScrollRestoration />
    </div>
  )
}
