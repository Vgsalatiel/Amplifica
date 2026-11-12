import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { logout } from '../../features/auth/api/auth-api'
import { useSession } from '../../features/auth/hooks/use-session'
import { cn } from '../../lib/cn'
import { buttonClasses } from '../ui/button-styles'
import { Logo } from '../ui/logo'
import { Container } from './container'
import { HeaderSearch } from './header-search'

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/artistas', label: 'Artistas' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/generos', label: 'Gêneros' },
  { to: '/guia', label: 'Guia visual' },
]

const linkBase =
  'inline-flex min-h-11 items-center whitespace-nowrap text-[15px] font-medium underline-offset-8 transition-colors hover:text-accent'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(linkBase, isActive && 'underline decoration-accent decoration-2')
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const session = useSession()
  // O link da administração só aparece para administradores.
  const NAV_ITEMS =
    session.status === 'authenticated' && session.user.role === 'ADMIN'
      ? [...BASE_NAV_ITEMS, { to: '/admin', label: 'Administração' }]
      : BASE_NAV_ITEMS
  const closeMenu = () => setMenuOpen(false)

  return (
    <header>
      <Container className="flex items-center gap-10 pt-5 pb-3">
        <Link to="/" aria-label="Amplifica, página inicial">
          <Logo className="text-4xl" />
        </Link>

        <nav aria-label="Principal" className="hidden gap-8 xl:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <HeaderSearch className="ml-auto hidden w-56 xl:flex" />

        <div className="hidden items-center gap-6 xl:flex">
          <AccountLinks onNavigate={closeMenu} />
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="menu-celular"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
          className="-mr-2.5 ml-auto flex size-11 cursor-pointer items-center justify-center xl:hidden"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            {menuOpen ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </Container>

      {menuOpen && (
        <nav id="menu-celular" aria-label="Principal" className="border-y border-rule xl:hidden">
          <Container className="flex flex-col items-start py-2">
            <HeaderSearch className="my-2 w-full" onNavigate={closeMenu} />
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={navLinkClass}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex w-full flex-col items-start gap-1 border-t border-rule pt-2 pb-2">
              <AccountLinks onNavigate={closeMenu} />
            </div>
          </Container>
        </nav>
      )}
    </header>
  )
}

/** "Entrar" e "Criar conta" para visitantes; perfil e "Sair" para quem está logado. */
function AccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const session = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Enquanto a sessão é verificada, não mostra nada: evita piscar "Entrar" para quem está logado.
  if (session.status === 'loading') {
    return null
  }

  if (session.status === 'anonymous') {
    return (
      <>
        <NavLink to="/entrar" className={navLinkClass} onClick={onNavigate}>
          Entrar
        </NavLink>
        <Link to="/cadastro" className={buttonClasses('primary', 'h-11 px-5 whitespace-nowrap')} onClick={onNavigate}>
          Criar conta
        </Link>
      </>
    )
  }

  async function handleLogout() {
    onNavigate()
    await logout()
    // Nada do que estava em cache pertence ao próximo visitante deste navegador.
    queryClient.clear()
    void navigate('/')
  }

  return (
    <>
      <NavLink to={`/u/${session.user.username}`} className={navLinkClass} onClick={onNavigate}>
        {session.user.displayName}
      </NavLink>
      <button type="button" onClick={() => void handleLogout()} className={cn(linkBase, 'cursor-pointer')}>
        Sair
      </button>
    </>
  )
}
