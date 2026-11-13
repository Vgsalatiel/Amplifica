import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { forgotPassword } from '../api/auth-api'
import { FormAlert } from '../components/form-alert'

/** Pedido de redefinição de senha, em /esqueci-a-senha. A resposta é a mesma exista a conta ou não. */
export function ForgotPasswordPage() {
  useDocumentTitle('Esqueci minha senha')
  const [email, setEmail] = useState('')
  const mutation = useMutation({ mutationFn: forgotPassword })
  const errors = fieldErrorsFrom(mutation.error)

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(email.trim())
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">Esqueci minha senha</h1>

      {mutation.isSuccess ? (
        <div role="status" className="mt-8 max-w-xl">
          <p className="font-serif text-xl">
            Se existe uma conta com o e-mail <strong>{email.trim()}</strong>, enviamos um link para criar uma nova senha. Ele vale por 1 hora.
          </p>
          <p className="mt-4 text-muted">Não chegou? Olhe a caixa de spam e confira se o endereço está certo.</p>
          <p className="mt-6">
            <TextLink to="/entrar">Voltar para entrar</TextLink>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-5 max-w-xl font-serif text-xl">Digite o e-mail da sua conta. Se ele existir, enviamos um link para você escolher outra senha.</p>
          <form onSubmit={submit} noValidate className="mt-8 flex max-w-md flex-col gap-6">
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
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enviando…' : 'Enviar link'}
              </Button>
              <TextLink to="/entrar">Voltar para entrar</TextLink>
            </div>
          </form>
        </>
      )}
    </Container>
  )
}
