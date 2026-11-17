import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { cn } from '../../../lib/cn'
import { releaseYear, todayInBrazil } from '../../../lib/format-date'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import type { ReleaseDetail } from '../../../types/api'
import { getRelease } from '../api/catalog-api'

/**
 * Posição de cada cartão: um leve giro, uma altura diferente (só a partir do `sm`, para o celular
 * ficar arrumado) e a cor da sombra, alternando amarelo e rosa. Parados: o giro é só desenho.
 */
const CARD_STYLES = [
  'sm:mt-0 -rotate-[1.5deg] shadow-[6px_6px_0_var(--color-accent)]',
  'sm:mt-8 rotate-[1.2deg] shadow-[6px_6px_0_var(--color-badge)]',
  'sm:mt-2 -rotate-1 shadow-[6px_6px_0_var(--color-accent)]',
  'sm:mt-10 rotate-[1.6deg] shadow-[6px_6px_0_var(--color-badge)]',
]

/**
 * Discos em destaque, como cartões soltos (estilo foto instantânea): capa, título, banda e ano.
 * Os que existem no catálogo aparecem de uma vez; um que não exista é pulado. Se nenhum existir
 * (catálogo ainda sem esses discos), a seção inteira some, em vez de mostrar cartões vazios.
 */
export function FeaturedAlbums({ slugs }: { slugs: string[] }) {
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['release', slug],
      queryFn: () => getRelease(slug),
      retry: shouldRetry,
      retryDelay,
    })),
  })

  const loaded = results.flatMap((result, index) =>
    result.data ? [{ slug: slugs[index]!, release: result.data }] : [],
  )
  const waiting = results.filter((result) => result.isPending).length

  if (waiting === 0 && loaded.length === 0) {
    return null
  }

  return (
    <ul
      aria-label="Discos em destaque"
      className="mt-12 grid grid-cols-2 items-start gap-x-5 gap-y-8 pb-8 sm:grid-cols-4 sm:gap-x-6"
    >
      {loaded.map(({ slug, release }, position) => (
        <FeaturedAlbum key={slug} slug={slug} release={release} style={CARD_STYLES[position % CARD_STYLES.length]!} />
      ))}
      {/* Enquanto os outros ainda carregam, um espaço neutro no lugar de cada um. */}
      {Array.from({ length: waiting }, (_, index) => (
        <li key={`espera-${index}`} aria-hidden="true" className="aspect-[4/5] bg-surface-raised" />
      ))}
    </ul>
  )
}

function FeaturedAlbum({ slug, release, style }: { slug: string; release: ReleaseDetail; style: string }) {
  const { title, cover, artists, releaseDate } = release
  const band = artists.map((artist) => artist.name).join(', ')
  const isNew = releaseYear(releaseDate) === todayInBrazil().slice(0, 4)

  return (
    <li className={cn('bg-white text-surface transition-transform motion-safe:hover:-translate-y-1', style)}>
      <Link to={`/lancamentos/${slug}`} className="group block p-2.5 pb-3.5 focus-visible:outline-offset-4">
        <div className="relative">
          {cover ? (
            <img
              src={cover.small}
              srcSet={`${cover.small} 400w, ${cover.large} 1200w`}
              sizes="(min-width: 640px) 22vw, 44vw"
              alt={`Capa de ${title}`}
              className="aspect-square w-full bg-surface-raised object-cover"
            />
          ) : (
            <Cover title={title} image={null} />
          )}
          {isNew && (
            <span className="absolute top-0 left-0 bg-badge px-2.5 py-0.5 font-display text-xs text-on-accent">
              NOVO
            </span>
          )}
        </div>
        <span className="mt-2.5 line-clamp-2 block font-display text-[17px] leading-tight group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
          {title}
        </span>
        <span className="block text-sm text-[#3b3b40]">
          {band}, {releaseYear(releaseDate)}
        </span>
      </Link>
    </li>
  )
}
