import { NavLink } from 'react-router'
import { cn } from '../../../lib/cn'

const TABS = [
  { to: '/cena-br', label: 'Bandas', end: true },
  { to: '/cena-br/historia', label: 'História da cena', end: false },
  { to: '/emo-tour', label: 'Emo Tour', end: false },
]

/** Submenu da área Cena BR: troca entre a lista de bandas e a história da cena. */
export function BrazilSceneNav() {
  return (
    <nav aria-label="Cena BR" className="mt-8 flex flex-wrap gap-3">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'inline-flex min-h-11 items-center rounded-full border-2 px-5 text-[15px] font-medium transition-colors',
              isActive
                ? 'border-accent bg-accent text-on-accent'
                : 'border-rule-strong hover:border-accent hover:text-accent',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
