import { useLocation } from 'react-router'
import { ButtonLink } from '../../../components/ui/button-link'
import { isReleased } from '../../../lib/format-date'
import { useSession } from '../../auth/hooks/use-session'
import { ResendVerification } from '../../auth/components/resend-verification'
import { ReviewForm } from '../../reviews/components/review-form'
import { useMyReview } from '../../reviews/hooks/use-reviews'

interface RatingPromptProps {
  slug: string
  releaseDate: string
}

/** Formulário de quem está logado: carrega a avaliação que já existe, se houver. */
function MemberReview({ slug }: { slug: string }) {
  const mine = useMyReview(slug, true)

  if (mine.isPending) {
    return <p className="mt-4 text-muted">Carregando sua avaliação…</p>
  }
  if (mine.isError) {
    return (
      <p role="alert" className="mt-4 text-danger">
        Não foi possível carregar sua avaliação.{' '}
        <button type="button" onClick={() => void mine.refetch()} className="cursor-pointer font-semibold underline underline-offset-4">
          Tentar de novo
        </button>
      </p>
    )
  }
  // Sem `key` ligada à avaliação: criar a primeira não pode recriar o formulário e apagar o aviso "salva".
  return <ReviewForm slug={slug} existing={mine.data} />
}

/**
 * Caixa de avaliação do disco. Ver discos, bandas e gêneros não exige conta; avaliar exige.
 * Quem clica em "Criar conta" ou "Entrar" daqui volta a este disco depois (state.from).
 */
export function RatingPrompt({ slug, releaseDate }: RatingPromptProps) {
  const session = useSession()
  const { pathname } = useLocation()

  // Enquanto a sessão é verificada, não mostra nada: evita piscar o convite para quem já tem conta.
  if (session.status === 'loading') {
    return null
  }
  const out = isReleased(releaseDate)

  return (
    <section aria-labelledby="avaliacao-titulo" className="border-t-4 border-accent bg-surface-raised px-6 py-8 md:px-10">
      <h2 id="avaliacao-titulo" className="font-display text-3xl leading-none font-normal italic">
        {out ? 'Já ouviu este disco?' : 'Ainda não saiu'}
      </h2>
      {!out ? (
        <p className="mt-4 max-w-xl font-serif text-xl">
          Este disco ainda não foi lançado, então ainda não pode receber nota.
        </p>
      ) : session.status === 'anonymous' ? (
        <>
          <p className="mt-4 max-w-xl font-serif text-xl">
            Crie uma conta para dar sua nota e escrever sua resenha. Para ver discos, bandas e gêneros, você não precisa de conta.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <ButtonLink to="/cadastro" state={{ from: pathname }}>
              Criar conta
            </ButtonLink>
            <ButtonLink to="/entrar" state={{ from: pathname }} variant="secondary">
              Entrar
            </ButtonLink>
          </div>
        </>
      ) : session.user.needsEmailVerification ? (
        <div className="mt-4 max-w-xl">
          <p className="font-serif text-xl">
            Para avaliar, confirme seu e-mail. Enviamos um link para {session.user.email}.
          </p>
          <p className="mt-5">
            <ResendVerification />
          </p>
        </div>
      ) : (
        // A chave separa o formulário de uma conta do de outra.
        <MemberReview key={session.user.id} slug={slug} />
      )}
    </section>
  )
}
