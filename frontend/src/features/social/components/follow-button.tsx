import { Link, useLocation } from 'react-router'
import { Button } from '../../../components/ui/button'
import { useSession } from '../../auth/hooks/use-session'
import { useFollowState, useToggleFollow } from '../hooks/use-social'

/**
 * "Seguir" e "Seguindo" no perfil de outra pessoa. Quem não está logado vai para a tela de entrar e
 * volta para este perfil. No próprio perfil, o botão não aparece.
 */
export function FollowButton({ username, displayName }: { username: string; displayName: string }) {
  const session = useSession()
  const { pathname } = useLocation()
  const signedIn = session.status === 'authenticated'
  const state = useFollowState(username, signedIn)
  const toggle = useToggleFollow(username)

  if (session.status === 'loading' || (signedIn && session.user.username === username)) {
    return null
  }
  if (!signedIn) {
    return (
      <Link
        to="/entrar"
        state={{ from: pathname }}
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-extrabold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Seguir
        <span className="sr-only"> {displayName} (entre na sua conta)</span>
      </Link>
    )
  }

  const following = state.data?.following ?? false
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={following ? 'secondary' : 'primary'}
        aria-pressed={following}
        disabled={state.isPending}
        onClick={() => toggle.mutate(!following)}
      >
        {following ? 'Seguindo' : 'Seguir'}
        <span className="sr-only"> {displayName}</span>
      </Button>
      {toggle.isError && (
        <p role="alert" className="text-sm text-danger">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
    </div>
  )
}
