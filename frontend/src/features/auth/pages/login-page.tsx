import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { login } from '../api/auth-api'
import { FormAlert } from '../components/form-alert'
import { useRedirectTarget } from '../hooks/use-redirect-after-auth'
import { useSession } from '../hooks/use-session'

/** Recorte circular na borda do ingresso, na cor do fundo da página. */
const NOTCH = 'absolute z-10 size-8 rounded-full bg-surface-raised'

/**
 * Login em forma de ingresso de show: um canhoto na cor de destaque, o picote e,
 * no corpo do ingresso, o formulário. "Entrada" vale como ingresso e como entrar.
 */
export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const redirectTo = useRedirectTarget()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => void navigate(redirectTo, { replace: true }),
  })
  const errors = fieldErrorsFrom(mutation.error)

  // Quem já chegou logado não precisa ver esta tela. Durante o envio do formulário a
  // sessão também passa a existir, mas aí quem decide o destino é o onSuccess acima.
  if (session.status === 'authenticated' && mutation.isIdle) {
    return <Navigate to={redirectTo} replace />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate({ email: email.trim(), password })
  }

  return (
    <div className="bg-surface-raised py-12 md:py-20">
      <Container>
        <div className="mx-auto grid max-w-4xl md:grid-cols-[340px_minmax(0,1fr)]">
          {/* Canhoto: decorativo, por isso fica fora da leitura de tela. */}
          <div
            aria-hidden="true"
            className="relative flex flex-col border-b-[3px] border-dashed border-surface-raised bg-accent px-8 py-8 text-on-accent md:min-h-[480px] md:border-r-[3px] md:border-b-0 md:px-9 md:py-10"
          >
            <p className="text-[15px]">Admite uma pessoa</p>
            <p className="mt-6 font-display text-7xl leading-[0.9] tracking-tight italic md:mt-auto md:text-[92px]">
              Entrada
            </p>
            <p className="mt-5 border-t border-on-accent/45 pt-4 text-[15px]">
              Discografias, notas e resenhas de quem ouve rock.
            </p>

            {/* Picotes: nas laterais quando o canhoto fica em cima (celular), em cima e embaixo ao lado. */}
            <span className={`${NOTCH} -bottom-4 -left-4 md:-top-4 md:-right-4 md:bottom-auto md:left-auto`} />
            <span className={`${NOTCH} -right-4 -bottom-4`} />
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col justify-center gap-6 bg-surface px-8 py-10 md:px-14"
          >
            <h1 className="font-display text-4xl leading-none font-normal tracking-tight md:text-[44px]">
              Apresente seus dados
            </h1>
            <FormAlert message={formMessageFrom(mutation.error)} />
            <TextField
              label="E-mail"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
            />
            <TextField
              label="Senha"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
            />
            <Button type="submit" variant="ink" disabled={mutation.isPending} className="self-start px-9">
              {mutation.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="mx-auto mt-8 max-w-4xl text-muted">
          Ainda não tem conta?{' '}
          <TextLink to="/cadastro" className="text-ink">
            Criar conta
          </TextLink>
        </p>
      </Container>
    </div>
  )
}
