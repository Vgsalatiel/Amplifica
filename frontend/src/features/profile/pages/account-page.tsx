import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextArea } from '../../../components/ui/text-area'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { updateSessionUser } from '../../../lib/session'
import type { User } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useSession } from '../../auth/hooks/use-session'
import { updateProfile } from '../api/profile-api'

const BIO_LIMIT = 280

/** Edição da própria conta em /conta. A rota é protegida: aqui sempre há usuário. */
export function AccountPage() {
  const session = useSession()
  if (session.status !== 'authenticated') {
    return null
  }
  return <AccountForm user={session.user} />
}

function AccountForm({ user }: { user: User }) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio ?? '')

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      updateSessionUser(updated)
      // O perfil público em cache ficou desatualizado.
      void queryClient.invalidateQueries({ queryKey: ['profile', updated.username] })
    },
  })
  const errors = fieldErrorsFrom(mutation.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate({ displayName, bio })
  }

  return (
    <Container className="pt-12 md:pt-20">
      <div className="max-w-xl">
        <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">Sua conta</h1>
        <p className="mt-4 text-muted">
          Você entrou como @{user.username} ({user.email}).{' '}
          <TextLink to={`/u/${user.username}`} className="text-ink">
            Ver perfil público
          </TextLink>
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col gap-6">
          <FormAlert message={formMessageFrom(mutation.error)} />
          <TextField
            label="Nome de exibição"
            name="displayName"
            autoComplete="name"
            maxLength={50}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            error={errors.displayName}
            hint="Aparece no topo do seu perfil e ao lado das suas resenhas."
          />
          <TextArea
            label="Bio"
            name="bio"
            maxLength={BIO_LIMIT}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            error={errors.bio}
            hint={`${bio.length} de ${BIO_LIMIT} caracteres.`}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
            <p aria-live="polite" className="text-muted">
              {mutation.isSuccess && !mutation.isPending ? 'Alterações salvas.' : ''}
            </p>
          </div>
        </form>
      </div>
    </Container>
  )
}
