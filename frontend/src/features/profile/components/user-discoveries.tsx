import { Link } from 'react-router'
import { formatShortDate } from '../../../lib/format-date'
import { useDiscoveries } from '../../clips/hooks/use-clips'
import { discovererBadge } from '../lib/discoverer-badge'

/** "Clipes que descobriu": os clipes aprovados que a pessoa sugeriu para a playlist, com o selo de Descobridor. */
export function UserDiscoveries({ username, isOwnProfile }: { username: string; isOwnProfile: boolean }) {
  const query = useDiscoveries(username)

  if (query.isPending) {
    return (
      <p role="status" className="mt-6 text-muted">
        Carregando…
      </p>
    )
  }
  if (query.isError) {
    return <p className="mt-6 text-muted">Não foi possível carregar os clipes descobertos.</p>
  }

  const { count, items } = query.data
  const badge = discovererBadge(count)

  if (count === 0) {
    return (
      <p className="mt-6 max-w-xl text-muted">
        {isOwnProfile
          ? 'Você ainda não tem clipes aprovados. Sugira um clipe na página inicial: quando for aprovado, ele aparece aqui e você ganha o selo de Descobridor.'
          : 'Nenhum clipe descoberto ainda.'}
      </p>
    )
  }

  return (
    <div className="mt-6">
      {badge && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-block bg-badge px-3 py-1 font-display text-lg text-on-accent">{badge.label}</span>
          <span className="text-muted">
            {count === 1 ? '1 clipe aprovado' : `${count} clipes aprovados`}
            {badge.next && ` · faltam ${badge.next.missing} para ${badge.next.label}`}
          </span>
        </p>
      )}
      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {items.map((clip) => (
          <li key={clip.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
            <div className="min-w-0">
              <a
                href={`https://www.youtube.com/watch?v=${clip.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-4 hover:text-accent"
              >
                {clip.title}
                <span className="sr-only"> (abre o YouTube em outra aba)</span>
              </a>
              <p className="text-sm text-muted">
                {clip.channelName} · {formatShortDate(clip.createdAt.slice(0, 10))}
              </p>
            </div>
            {clip.artist && (
              <Link
                to={`/artistas/${clip.artist.slug}`}
                className="text-sm font-semibold underline underline-offset-4 hover:text-accent"
              >
                {clip.artist.name}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
