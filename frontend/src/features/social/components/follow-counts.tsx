import { Link } from 'react-router'
import { useFollowCounts } from '../hooks/use-social'

/** "12 seguidores, 8 seguindo", com links para as listas. Não aparece se a contagem não carregar. */
export function FollowCounts({ username }: { username: string }) {
  const counts = useFollowCounts(username)
  if (!counts.data) {
    return null
  }
  const { followers, following } = counts.data
  const link = 'underline underline-offset-4 hover:text-accent'
  return (
    <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-muted">
      <Link to={`/u/${username}/seguidores`} className={link}>
        {followers} {followers === 1 ? 'seguidor' : 'seguidores'}
      </Link>
      <Link to={`/u/${username}/seguindo`} className={link}>
        {following} seguindo
      </Link>
    </p>
  )
}
