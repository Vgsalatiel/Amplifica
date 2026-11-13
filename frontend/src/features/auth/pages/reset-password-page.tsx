import { useMutation } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { ButtonLink } from '../../../components/ui/button-link'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { ApiError } from '../../../lib/http'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { resetPassword } from '../api/auth-api'
import { FormAlert } from '../components/form-alert'

/** Escolha da nova senha, em /redefinir-senha?token=... (o link do e-mail). */
export function ResetPasswordPage() {
  useDocumentTitle('Nova senha')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  // Guarda o token e tira da barra de endereço: ele não deve ficar no histórico nem ser copiado junto com a URL.
  const [token] = useState(() => params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const mutation = useMutation({ mutationFn: () => resetPassword(token, password) })
  const errors = fieldErrorsFrom(mutation.error)

  useEffect(() => {
    if (params.has('token')) {
      void navigate('/redefinir-senha', { replace: true })
    }
  }, [params, navigate])

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  const linkProblem = !token || (mutation.error instanceof ApiError && mutation.error.code === 'invalid_token')

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-[1.06] font-normal tracking-tight md:text-6xl">
        {mutation.isSuccess ? 'Senha alterada' : 'Escolha uma nova senha'}
      </h1>

      {mutation.isSuccess ? (
        <div role="status" className="mt-8 max-w-xl">
          <p className="font-serif text-xl">Por segurança, você foi desconectado de todos os aparelhos. Entre com a nova senha.</p>
          <p className="mt-6">
            <ButtonLink to="/entrar">Entrar</ButtonLink>
          </p>
        </div>
      ) : linkProblem ? (
        <div className="mt-8 max-w-xl">
          <p role="alert" className="font-serif text-xl">
            {token ? 'Esse link venceu ou já foi usado.' : 'Esse link está incompleto.'} Peça um novo para escolher a senha.
          </p>
          <p className="mt-6">
            <ButtonLink to="/esqueci-a-senha">Pedir novo link</ButtonLink>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 flex max-w-md flex-col gap-6">
          <FormAlert message={formMessageFrom(mutation.error)} />
          <TextField
            label="Nova senha"
            type="password"
            name="new-password"
            autoComplete="new-password"
            hint="Pelo menos 8 caracteres."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
            <TextLink to="/entrar">Cancelar</TextLink>
          </div>
        </form>
      )}
    </Container>
  )
}
