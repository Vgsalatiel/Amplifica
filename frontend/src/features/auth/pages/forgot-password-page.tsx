import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
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
  const navigate = useNavigate()
  // Depois do pedido, segue para a tela do código, já com o e-mail preenchido.
  const mutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (_, sent) => void navigate('/redefinir-senha', { state: { email: sent } }),
  })
  const errors = fieldErrorsFrom(mutation.error)

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(email.trim())
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">Esqueci minha senha</h1>

      <p className="mt-5 max-w-xl text-xl">Digite o e-mail da sua conta. Se ele existir, enviamos um código de 6 números para você escolher outra senha.</p>
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
            {mutation.isPending ? 'Enviando…' : 'Enviar código'}
          </Button>
          <TextLink to="/entrar">Voltar para entrar</TextLink>
        </div>
      </form>
    </Container>
  )
}
