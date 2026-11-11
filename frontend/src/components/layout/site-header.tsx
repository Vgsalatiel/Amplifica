import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import { Logo } from '../ui/logo'
import { Container } from './container'

// As seções do produto (artistas, lançamentos, gêneros) entram aqui nas etapas em que forem criadas.
const NAV_ITEMS = [
  { to: '/', label: 'Início' },
  { to: '/guia', label: 'Guia visual' },
]

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'inline-flex min-h-11 items-center text-[15px] font-medium underline-offset-8 transition-colors hover:text-accent',
    isActive && 'underline decoration-accent decoration-2',
  )
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header>
      <Container className="flex items-center gap-10 pt-5 pb-3">
        <Link to="/" aria-label="Amplifica, página inicial">
          <Logo className="text-4xl" />
        </Link>

        <nav aria-label="Principal" className="hidden gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="menu-celular"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
          className="-mr-2.5 ml-auto flex size-11 cursor-pointer items-center justify-center md:hidden"
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
        <nav id="menu-celular" aria-label="Principal" className="border-y border-rule md:hidden">
          <Container className="flex flex-col py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </Container>
        </nav>
      )}
    </header>
  )
}
