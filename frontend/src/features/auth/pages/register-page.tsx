import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom, type FieldErrors } from '../../../lib/form-errors'
import { register, type RegisterInput } from '../api/auth-api'
import { AuthPage } from '../components/auth-page'
import { FormAlert } from '../components/form-alert'
import { useSession } from '../hooks/use-session'
import { validateRegister } from '../validation'

export function RegisterPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterInput>({ email: '', username: '', password: '' })
  const [localErrors, setLocalErrors] = useState<FieldErrors>({})

  const mutation = useMutation({
    mutationFn: register,
    // Depois de criar a conta, a pessoa cai no próprio perfil.
    onSuccess: (user) => void navigate(`/u/${user.username}`, { replace: true }),
  })
  // Erros da checagem local têm prioridade; os da API aparecem nos mesmos campos.
  const errors = { ...fieldErrorsFrom(mutation.error), ...localErrors }

  // Quem já chegou logado não precisa ver esta tela. Durante o envio do formulário a
  // sessão também passa a existir, mas aí quem decide o destino é o onSuccess acima.
  if (session.status === 'authenticated' && mutation.isIdle) {
    return <Navigate to="/" replace />
  }

  function update(field: keyof RegisterInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setLocalErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { ...form, email: form.email.trim() }
    const problems = validateRegister(input)
    setLocalErrors(problems)
    if (Object.keys(problems).length === 0) {
      mutation.mutate(input)
    }
  }

  return (
    <AuthPage
      title="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <TextLink to="/entrar" className="text-ink">
            Entrar
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
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          error={errors.email || undefined}
          hint="Não aparece no seu perfil."
        />
        <TextField
          label="Nome de usuário"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={form.username}
          onChange={(event) => update('username', event.target.value.toLowerCase())}
          error={errors.username || undefined}
          hint="De 3 a 20 caracteres: letras minúsculas, números, ponto e sublinhado."
        />
        <TextField
          label="Senha"
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          error={errors.password || undefined}
          hint="Pelo menos 8 caracteres."
        />
        <Button type="submit" disabled={mutation.isPending} className="self-start">
          {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthPage>
  )
}
