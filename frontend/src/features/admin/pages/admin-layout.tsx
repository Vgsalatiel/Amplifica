import { NavLink, Outlet } from 'react-router'
import { Container } from '../../../components/layout/container'
import { cn } from '../../../lib/cn'

const SECTIONS = [
  { to: '/admin/lancamentos', label: 'Lançamentos' },
  { to: '/admin/artistas', label: 'Artistas' },
  { to: '/admin/generos', label: 'Gêneros' },
  { to: '/admin/shows', label: 'Shows' },
]

/** Moldura da administração: título e as seções do catálogo e da agenda. */
export function AdminLayout() {
  return (
    <Container className="pt-10 md:pt-14">
      <header className="border-b border-rule pb-5">
        <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">Administração</h1>
        <nav aria-label="Seções da administração" className="mt-6 flex flex-wrap gap-x-8">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-11 items-center font-medium underline-offset-8 hover:text-accent',
                  isActive && 'underline decoration-accent decoration-2',
                )
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="pt-10">
        <Outlet />
      </div>
    </Container>
  )
}
