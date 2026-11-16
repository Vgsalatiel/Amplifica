import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import { onDark } from '../../../lib/accent'
import { isHexColor } from '../../../lib/color'
import type { ReleaseSummary } from '../../../types/api'

/** Quantas capas cabem no mural. */
export const MURAL_SIZE = 7

/**
 * Mural de capas da abertura: discos do catálogo (os mais bem avaliados primeiro), cada um com um
 * bloco na cor de destaque do disco atrás da capa. As colunas se deslocam na vertical para o mural
 * parecer uma parede, e não uma grade. Cada capa leva à página do disco. Só entram discos com capa.
 */
export function CoverMural({ releases }: { releases: ReleaseSummary[] }) {
  const tiles = releases.filter((release) => release.cover).slice(0, MURAL_SIZE)
  if (tiles.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute -top-6 right-0 rotate-12 text-4xl text-accent">
        ★
      </span>
      <span aria-hidden="true" className="absolute -bottom-5 left-1/3 -rotate-12 text-3xl text-ink">
        ♥
      </span>
      <ul aria-label="Discos em destaque" className="grid grid-cols-3 gap-x-5 gap-y-8 pr-2 pb-2 sm:gap-x-7">
        {tiles.map((release, index) => {
          const color = release.accentColor && isHexColor(release.accentColor) ? release.accentColor : null
          const artists = release.artists.map((artist) => artist.name).join(', ')
          return (
            <li
              key={release.id}
              // Uma entrada só, escalonada, quando a página abre. Quem prefere menos movimento não vê animação.
              style={{ animationDelay: `${index * 70}ms` }}
              className={cn(
                'animate-page-enter motion-reduce:animate-none',
                index % 3 === 1 && 'translate-y-10',
                index % 3 === 2 && '-translate-y-3',
              )}
            >
              <Link
                to={`/lancamentos/${release.slug}`}
                aria-label={`${release.title}, ${artists}`}
                className="group block transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <img
                  src={release.cover!.small}
                  alt=""
                  loading={index < 3 ? 'eager' : 'lazy'}
                  // O bloco na cor do disco aparece atrás da capa, deslocado para baixo e para a direita.
                  style={{ boxShadow: `8px 8px 0 ${color ? onDark(color) : 'var(--color-accent)'}` }}
                  className="aspect-square w-full bg-surface-raised object-cover"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
