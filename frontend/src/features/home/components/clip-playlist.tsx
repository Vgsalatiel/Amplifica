import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import type { PlaylistItem } from '../lib/playlist'

interface ClipPlaylistProps {
  items: PlaylistItem[]
  /** Posição do clipe que está tocando. */
  current: number
  onSelect: (index: number) => void
}

/**
 * A playlist em lista: o clipe que toca fica em destaque, clicar em outro toca aquele, e a banda
 * (quando está no catálogo) leva à página dela. Sugestões aprovadas dizem quem as sugeriu.
 */
export function ClipPlaylist({ items, current, onSelect }: ClipPlaylistProps) {
  return (
    <ol aria-label="Playlist" className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
      {items.map((item, index) => {
        const playing = index === current
        return (
          <li
            key={item.id}
            className={cn(
              'flex items-stretch gap-2 border transition-colors',
              playing ? 'border-2 border-accent bg-surface-raised' : 'border-rule hover:border-accent',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={playing ? 'true' : undefined}
              className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 p-2 text-left"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm',
                  playing ? 'bg-accent text-on-accent' : 'border border-rule-strong text-muted',
                )}
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-1 block font-bold">{item.title}</span>
                <span className="line-clamp-1 block text-sm text-muted">
                  {item.subtitle}
                  {item.suggestedBy && ` · sugerido por @${item.suggestedBy.username}`}
                </span>
              </span>
              {playing && <span className="sr-only">(tocando agora)</span>}
            </button>
            {item.artist && (
              <Link
                to={`/artistas/${item.artist.slug}`}
                aria-label={`Página de ${item.artist.name}`}
                className="flex shrink-0 items-center px-3 text-sm font-semibold underline underline-offset-4 hover:text-accent"
              >
                Banda
              </Link>
            )}
            {item.suggestedBy && (
              <Link
                to={`/u/${item.suggestedBy.username}`}
                aria-label={`Perfil de @${item.suggestedBy.username}, que sugeriu este clipe`}
                className="flex shrink-0 items-center px-3 text-sm font-semibold underline underline-offset-4 hover:text-accent"
              >
                Perfil
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}
