import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextLink } from '../../../components/ui/text-link'
import { cn } from '../../../lib/cn'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { register, type RegisterInput } from '../api/auth-api'
import { FormAlert } from '../components/form-alert'
import { PromptField } from '../components/prompt-field'
import { StepProgress } from '../components/step-progress'
import { useSession } from '../hooks/use-session'
import { validateRegister } from '../validation'

type StepField = 'email' | 'username' | 'password'

const STEPS: Array<{ field: StepField; name: string; backLabel: string }> = [
  { field: 'email', name: 'E-mail', backLabel: 'Voltar para o e-mail' },
  { field: 'username', name: 'Nome de usuário', backLabel: 'Voltar para o nome de usuário' },
  { field: 'password', name: 'Senha', backLabel: '' },
]

/**
 * Cadastro em três passos, uma pergunta por tela. Os dados só são enviados à API
 * no último passo; se ela recusar algo (por exemplo, e-mail já em uso), a página
 * volta ao passo do campo recusado e mostra o motivo ali.
 */
export function RegisterPage() {
  const session = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterInput>({ email: '', username: '', password: '' })
  const [stepIndex, setStepIndex] = useState(0)
  const [stepError, setStepError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const mutation = useMutation({
    mutationFn: register,
    // Depois de criar a conta, a pessoa cai no próprio perfil.
    onSuccess: (user) => void navigate(`/u/${user.username}`, { replace: true }),
    onError: (error) => {
      const serverErrors = fieldErrorsFrom(error)
      const rejected = STEPS.findIndex((step) => serverErrors[step.field])
      if (rejected !== -1) {
        setStepIndex(rejected)
        setStepError(serverErrors[STEPS[rejected].field])
      }
    },
  })

  // Quem já chegou logado não precisa ver esta tela. Durante o envio do formulário a
  // sessão também passa a existir, mas aí quem decide o destino é o onSuccess acima.
  if (session.status === 'authenticated' && mutation.isIdle) {
    return <Navigate to="/" replace />
  }

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  function update(value: string) {
    setForm((current) => ({ ...current, [step.field]: value }))
    setStepError(null)
  }

  function goTo(index: number) {
    setStepIndex(index)
    setStepError(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { ...form, email: form.email.trim() }
    setForm(input)

    const problem = validateRegister(input)[step.field]
    if (problem) {
      setStepError(problem)
      return
    }

    if (isLastStep) {
      mutation.mutate(input)
    } else {
      goTo(stepIndex + 1)
    }
  }

  return (
    <Container className="pt-10 md:pt-16">
      <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
        <StepProgress current={stepIndex + 1} total={STEPS.length} />

        {/* A `key` remonta o passo a cada troca: reinicia a animação e leva o foco ao campo novo. */}
        <div key={step.field} className="mt-7 motion-safe:animate-page-enter">
          {/* Só erros sem campo (rede, servidor) aparecem aqui; os demais vão para o passo certo. */}
          {mutation.isError && !stepError && (
            <div className="mb-6 max-w-xl">
              <FormAlert message={formMessageFrom(mutation.error) ?? 'Confira os dados e tente de novo.'} />
            </div>
          )}

          {step.field === 'email' && (
            <PromptField
              question="Qual é o seu e-mail?"
              description="Você usa para entrar. Ele não aparece no seu perfil."
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={(event) => update(event.target.value)}
              error={stepError ?? undefined}
            />
          )}

          {step.field === 'username' && (
            <PromptField
              question="Como você quer ser chamado?"
              description="É o nome que aparece ao lado das suas resenhas e no endereço do seu perfil."
              prefix="@"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={(event) => update(event.target.value.toLowerCase())}
              error={stepError ?? undefined}
              hint="De 3 a 20 caracteres: letras minúsculas, números, ponto e sublinhado."
            />
          )}

          {step.field === 'password' && (
            <PromptField
              question="Agora, crie uma senha."
              description="Uma frase que só você conhece funciona melhor do que uma palavra com símbolos."
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update(event.target.value)}
              error={stepError ?? undefined}
              hint="Pelo menos 8 caracteres."
              trailing={
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="min-h-11 shrink-0 cursor-pointer self-center px-1 text-sm font-semibold underline underline-offset-4 hover:text-accent"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              }
            />
          )}
        </div>

        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2">
          <Button type="submit" disabled={mutation.isPending} className="px-8">
            {isLastStep ? (mutation.isPending ? 'Criando conta…' : 'Criar conta') : 'Continuar'}
          </Button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              className="min-h-12 cursor-pointer font-semibold underline underline-offset-4 hover:text-accent"
            >
              {STEPS[stepIndex - 1].backLabel}
            </button>
          )}
        </div>
      </form>

      {/* Resumo dos passos. Os já respondidos mostram o valor e servem de atalho para corrigir. */}
      <ol className="mt-14 flex flex-col gap-x-12 gap-y-1 border-t border-rule pt-5 text-[15px] md:flex-row">
        {STEPS.map((item, index) => {
          const label = `${index + 1}. ${item.name}`
          const answered = index < stepIndex
          return (
            <li
              key={item.field}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={cn('min-w-0', index === stepIndex ? 'font-semibold' : 'text-muted')}
            >
              {answered ? (
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  className="min-h-11 max-w-full cursor-pointer truncate text-left hover:text-accent"
                >
                  {label}: {item.field === 'username' ? `@${form.username}` : form.email}
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center">{label}</span>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-muted">
        Já tem conta?{' '}
        <TextLink to="/entrar" className="text-ink">
          Entrar
        </TextLink>
      </p>
    </Container>
  )
}
