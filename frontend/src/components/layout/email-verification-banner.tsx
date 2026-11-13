import { ResendVerification } from '../../features/auth/components/resend-verification'
import { useSession } from '../../features/auth/hooks/use-session'
import { Container } from './container'

/** Aviso para quem ainda não confirmou o e-mail: sem isso, ainda não dá para avaliar discos. */
export function EmailVerificationBanner() {
  const session = useSession()
  if (session.status !== 'authenticated' || !session.user.needsEmailVerification) {
    return null
  }
  return (
    <div className="border-y border-rule bg-surface-raised">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3 text-sm">
        <p>
          <span className="font-semibold">Confirme seu e-mail para poder avaliar discos.</span> Enviamos um link para {session.user.email}.
        </p>
        <ResendVerification />
      </Container>
    </div>
  )
}
