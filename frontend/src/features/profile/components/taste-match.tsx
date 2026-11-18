import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { TextLink } from '../../../components/ui/text-link'
import { ApiError } from '../../../lib/http'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import type { TasteMatch } from '../../../types/api'
import { useSession } from '../../auth/hooks/use-session'
import { getTasteMatch } from '../api/profile-api'

/**
 * "Gosto em comum": compara as notas que você deu a discos com as da pessoa do perfil. Mostra a
 * porcentagem, as bandas que os dois curtem e as que ela recomenda e você ainda não avaliou.
 * Só aparece para quem está logado, em perfil alheio.
 */
export function TasteMatchSection({ username, displayName }: { username: string; displayName: string }) {
  const session = useSession()
  const enabled = session.status === 'authenticated'
  const query = useQuery({
    queryKey: ['taste', username, enabled ? session.user.id : null],
    queryFn: () => getTasteMatch(username),
    enabled,
    retry: shouldRetry,
    retryDelay,
  })

  if (session.status === 'loading') {
    return null
  }

  return (
    <section className="mt-16 border-t border-rule pt-12" aria-labelledby="gosto-titulo">
      <h2 id="gosto-titulo" className="font-display text-4xl leading-none font-normal">
        Gosto em comum
      </h2>

      {session.status === 'anonymous' ? (
        <p className="mt-6 max-w-xl">
          <TextLink to="/entrar">Entre na sua conta</TextLink> ou <TextLink to="/cadastro">crie uma</TextLink> para ver
          quanto o seu gosto combina com o de {displayName}.
        </p>
      ) : query.isPending ? (
        <p role="status" className="mt-6 text-muted">
          Comparando…
        </p>
      ) : query.isError ? (
        <p className="mt-6 text-muted">
          {query.error instanceof ApiError && query.error.status === 400
            ? 'Esse é o seu perfil.'
            : 'Não foi possível comparar agora. Tente de novo em instantes.'}
        </p>
      ) : (
        <Result match={query.data} displayName={displayName} />
      )}
    </section>
  )
}

function Result({ match, displayName }: { match: TasteMatch; displayName: string }) {
  if (match.myRatedCount === 0) {
    return (
      <p className="mt-6 max-w-xl text-muted">
        Você ainda não avaliou nenhum disco. <TextLink to="/lancamentos">Dê notas a alguns discos</TextLink> e a
        comparação com {displayName} aparece aqui.
      </p>
    )
  }
  if (match.theirRatedCount === 0) {
    return <p className="mt-6 max-w-xl text-muted">{displayName} ainda não avaliou nenhum disco, então não dá para comparar.</p>
  }

  return (
    <div className="mt-6">
      {match.score !== null ? (
        <p className="flex flex-wrap items-baseline gap-x-4">
          <span className="font-display text-6xl leading-none text-accent md:text-7xl">{match.score}%</span>
          <span className="text-lg">
            de combinação, com base em {match.sharedCount} {match.sharedCount === 1 ? 'banda' : 'bandas'} que vocês dois
            avaliaram.
          </span>
        </p>
      ) : (
        <p className="max-w-xl text-muted">
          Vocês têm {match.sharedCount === 0 ? 'nenhuma banda' : 'só uma banda'} avaliada em comum, pouco para calcular
          a combinação. Avaliar mais discos ajuda.
        </p>
      )}

      {match.bothLike.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-2xl leading-none font-normal">Bandas que vocês dois curtem</h3>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            {match.bothLike.map((item) => (
              <li key={item.artist.slug}>
                <Link to={`/artistas/${item.artist.slug}`} className="group block">
                  <Cover title={item.artist.name} image={item.artist.image} />
                  <p className="mt-2 font-display text-xl leading-tight group-hover:underline">{item.artist.name}</p>
                  <p className="text-sm text-muted">
                    Você {item.mine.toLocaleString('pt-BR')}, {displayName} {item.theirs.toLocaleString('pt-BR')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.recommended.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-2xl leading-none font-normal">Para você ouvir, indicações de {displayName}</h3>
          <p className="mt-2 text-sm text-muted">Bandas que ela avaliou muito bem e que você ainda não avaliou.</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            {match.recommended.map((item) => (
              <li key={item.artist.slug}>
                <Link to={`/artistas/${item.artist.slug}`} className="group block">
                  <Cover title={item.artist.name} image={item.artist.image} />
                  <p className="mt-2 font-display text-xl leading-tight group-hover:underline">{item.artist.name}</p>
                  <p className="text-sm text-muted">Nota {item.theirs.toLocaleString('pt-BR')}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.bothLike.length === 0 && match.recommended.length === 0 && match.score !== null && (
        <p className="mt-8 max-w-xl text-muted">Nenhuma banda que os dois curtem ainda. Os gostos divergem por aqui.</p>
      )}
    </div>
  )
}
