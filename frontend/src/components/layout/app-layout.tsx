import { Outlet } from 'react-router'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/** Moldura comum a todas as páginas: cabeçalho, conteúdo da rota e rodapé. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
