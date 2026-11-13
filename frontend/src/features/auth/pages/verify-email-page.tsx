import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { ButtonLink } from '../../../components/ui/button-link'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { ApiError } from '../../../lib/http'
import { refreshCurrentUser, verifyEmail } from '../api/auth-api'
import { useSession } from '../hooks/use-session'

/** Confirma o e-mail ao abrir o link do e-mail, em /confirmar-email?token=... */
export function VerifyEmailPage() {
  useDocumentTitle('Confirmar e-mail')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const session = useSession()
  const [token] = useState(() => params.get('token') ?? '')
  const started = useRef(false)

  const mutation = useMutation({
    mutationFn: async () => {
      await verifyEmail(token)
      // Se a pessoa está logada neste navegador, o aviso de "confirme seu e-mail" some na hora.
      await refreshCurrentUser().catch(() => undefined)
    },
  })

  useEffect(() => {
    if (params.has('token')) {
      void navigate('/confirmar-email', { replace: true })
    }
  }, [params, navigate])

  // O link só vale uma vez: dispara uma única chamada, mesmo que o React remonte o efeito em desenvolvimento.
  useEffect(() => {
    if (token && !started.current) {
      started.current = true
      mutation.mutate()
    }
  }, [token, mutation])

  const expired = !token || (mutation.error instanceof ApiError && mutation.error.code === 'invalid_token')

  return (
    <Container className="pt-10 md:pt-16">
      {mutation.isSuccess ? (
        <>
          <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">E-mail confirmado</h1>
          <p role="status" className="mt-5 max-w-xl font-serif text-xl">
            Pronto. Agora você pode avaliar discos e escrever resenhas.
          </p>
          <p className="mt-6">
            <ButtonLink to="/lancamentos">Ver os lançamentos</ButtonLink>
          </p>
        </>
      ) : expired || mutation.isError ? (
        <>
          <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">Não foi possível confirmar</h1>
          <p role="alert" className="mt-5 max-w-xl font-serif text-xl">
            {expired
              ? 'Esse link venceu, já foi usado ou está incompleto.'
              : 'O servidor não respondeu. Tente abrir o link de novo em instantes.'}
          </p>
          <p className="mt-6">
            {session.status === 'authenticated' ? (
              <>Use o botão &ldquo;Reenviar e-mail&rdquo; no aviso no alto da página para receber um link novo.</>
            ) : (
              <>
                <TextLink to="/entrar">Entre na sua conta</TextLink> para receber um link novo.
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">Confirmando seu e-mail</h1>
          <p role="status" className="mt-5 text-muted">
            Só um instante…
          </p>
        </>
      )}
    </Container>
  )
}
