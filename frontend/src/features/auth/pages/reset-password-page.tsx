import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { ButtonLink } from '../../../components/ui/button-link'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { ApiError } from '../../../lib/http'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { checkResetCode, resetPassword } from '../api/auth-api'
import { FormAlert } from '../components/form-alert'

type Step = 'code' | 'password' | 'done'

const isInvalidCode = (error: unknown) => error instanceof ApiError && error.code === 'invalid_code'

/**
 * Nova senha, em /redefinir-senha, em três passos: o código de 6 números que veio por e-mail, depois
 * a nova senha em dois campos (digitada duas vezes) e, por fim, o aviso de que deu certo. O e-mail
 * vem da tela anterior; se a pessoa chegou direto aqui, digita o e-mail junto com o código.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Nova senha')
  const location = useLocation()
  const fromState = (location.state as { email?: string } | null)?.email ?? ''
  const [step, setStep] = useState<Step>('code')
  const [email, setEmail] = useState(fromState)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const check = useMutation({ mutationFn: () => checkResetCode(email.trim(), code.trim()), onSuccess: () => setStep('password') })
  const save = useMutation({
    mutationFn: () => resetPassword(email.trim(), code.trim(), password),
    onSuccess: () => setStep('done'),
  })

  function submitCode(event: FormEvent) {
    event.preventDefault()
    check.mutate()
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    save.mutate()
  }

  const codeError = check.error && !isInvalidCode(check.error) ? check.error : null
  const codeErrors = fieldErrorsFrom(check.error)
  const saveErrors = fieldErrorsFrom(save.error)
  // O código venceu ou foi gasto enquanto a pessoa escolhia a senha: volta a pedir um novo.
  const codeLost = isInvalidCode(save.error)

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">
        {step === 'done' ? 'Senha alterada' : step === 'password' ? 'Escolha uma nova senha' : 'Digite o código'}
      </h1>

      {step === 'done' ? (
        <div role="status" className="mt-8 max-w-xl">
          <p className="text-xl">Por segurança, você foi desconectado de todos os aparelhos. Entre com a nova senha.</p>
          <p className="mt-6">
            <ButtonLink to="/entrar">Entrar</ButtonLink>
          </p>
        </div>
      ) : codeLost ? (
        <div className="mt-8 max-w-xl">
          <p role="alert" className="text-xl">
            O código venceu ou já foi usado. Peça um novo para escolher a senha.
          </p>
          <p className="mt-6">
            <ButtonLink to="/esqueci-a-senha">Pedir novo código</ButtonLink>
          </p>
        </div>
      ) : step === 'password' ? (
        <form onSubmit={submitPassword} noValidate className="mt-8 flex max-w-md flex-col gap-6">
          <p className="text-xl">Código aceito. Agora escolha a nova senha e repita para confirmar.</p>
          <FormAlert message={formMessageFrom(save.error)} />
          <TextField
            label="Nova senha"
            type="password"
            name="new-password"
            autoComplete="new-password"
            hint="Pelo menos 8 caracteres."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={saveErrors.password}
          />
          <TextField
            label="Repita a nova senha"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={mismatch ? 'As duas senhas precisam ser iguais.' : undefined}
          />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
            <TextLink to="/entrar">Cancelar</TextLink>
          </div>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate className="mt-8 flex max-w-md flex-col gap-6">
          <p className="text-xl">
            {fromState
              ? `Se existe uma conta com o e-mail ${fromState}, enviamos um código de 6 números. Ele vale por 30 minutos.`
              : 'Digite o e-mail da sua conta e o código de 6 números que enviamos para ele.'}
          </p>
          <FormAlert message={isInvalidCode(check.error) ? 'O código está errado ou venceu. Confira os 6 números ou peça um novo.' : formMessageFrom(codeError)} />
          {!fromState && (
            <TextField
              label="E-mail"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={codeErrors.email}
            />
          )}
          <TextField
            label="Código"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            hint="Os 6 números do e-mail. Olhe também a caixa de spam."
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            error={codeErrors.code}
          />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Button type="submit" disabled={check.isPending}>
              {check.isPending ? 'Conferindo…' : 'Continuar'}
            </Button>
            <TextLink to="/esqueci-a-senha">Pedir novo código</TextLink>
          </div>
        </form>
      )}
    </Container>
  )
}
