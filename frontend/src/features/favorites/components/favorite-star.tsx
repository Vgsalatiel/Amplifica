import { Link, useLocation } from 'react-router'
import { cn } from '../../../lib/cn'
import { useSession } from '../../auth/hooks/use-session'
import { useMyFavorite, useToggleFavorite } from '../hooks/use-favorites'

const star = (filled: boolean) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z" />
  </svg>
)

const base =
  'inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-wait'

/**
 * A estrela da banda: um clique marca como favorita e aparece no perfil da pessoa; outro clique tira.
 * Quem não está logado vai para a tela de entrar e volta para esta página.
 */
export function FavoriteStar({ slug, name }: { slug: string; name: string }) {
  const session = useSession()
  const { pathname } = useLocation()
  const signedIn = session.status === 'authenticated'
  const mine = useMyFavorite(slug, signedIn)
  const toggle = useToggleFavorite(slug)

  if (session.status === 'loading') {
    return null
  }
  if (!signedIn) {
    return (
      <Link
        to="/entrar"
        state={{ from: pathname }}
        aria-label={`Entre para marcar ${name} como favorita`}
        title="Entre para marcar como favorita"
        className={cn(base, 'border-rule-strong text-muted hover:border-accent hover:text-accent')}
      >
        {star(false)}
      </Link>
    )
  }

  const favorite = mine.data?.favorite ?? false
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={favorite ? `Tirar ${name} das favoritas` : `Marcar ${name} como favorita`}
        title={favorite ? 'Tirar das favoritas' : 'Marcar como favorita'}
        disabled={mine.isPending}
        onClick={() => toggle.mutate(!favorite)}
        className={cn(
          base,
          'cursor-pointer',
          favorite ? 'border-accent bg-accent text-on-accent' : 'border-rule-strong text-ink hover:border-accent hover:text-accent',
        )}
      >
        {star(favorite)}
      </button>
      {toggle.isError && (
        <p role="alert" className="text-sm text-danger">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
    </div>
  )
}
