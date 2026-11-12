import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { login } from '../api/auth-api'
import { AuthPage } from '../components/auth-page'
import { FormAlert } from '../components/form-alert'
import { useRedirectTarget } from '../hooks/use-redirect-after-auth'
import { useSession } from '../hooks/use-session'

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
    <AuthPage
      title="Entrar"
      footer={
        <>
          Ainda não tem conta?{' '}
          <TextLink to="/cadastro" className="text-ink">
            Criar conta
          </TextLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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
        <Button type="submit" disabled={mutation.isPending} className="self-start">
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthPage>
  )
}
