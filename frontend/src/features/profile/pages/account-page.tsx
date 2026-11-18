import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { deleteAccount } from '../../auth/api/auth-api'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextArea } from '../../../components/ui/text-area'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { ApiError } from '../../../lib/http'
import { updateSessionUser } from '../../../lib/session'
import type { User } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useSession } from '../../auth/hooks/use-session'
import { ImageUploader } from '../../admin/components/image-uploader'
import { removeAvatar, updateProfile, uploadAvatar } from '../api/profile-api'

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

  // Trocar ou remover o avatar atualiza só o usuário da sessão: o nome e a bio digitados
  // e ainda não salvos ficam como estão.
  const afterAvatarChange = (updated: User) => {
    updateSessionUser(updated)
    void queryClient.invalidateQueries({ queryKey: ['profile', updated.username] })
  }
  const upload = useMutation({ mutationFn: uploadAvatar, onSuccess: afterAvatarChange })
  const removeCurrent = useMutation({ mutationFn: removeAvatar, onSuccess: afterAvatarChange })
  const avatarError = upload.error ?? removeCurrent.error

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

        <ImageUploader
          className="mt-10"
          label="Foto de perfil"
          description="JPEG, PNG ou WebP, até 5 MB. A imagem é recortada em quadrado."
          image={user.avatar}
          onUpload={(file) => upload.mutate(file)}
          onRemove={() => removeCurrent.mutate()}
          pending={upload.isPending || removeCurrent.isPending}
          error={
            avatarError
              ? avatarError instanceof ApiError
                ? avatarError.message
                : 'Não foi possível falar com o servidor.'
              : null
          }
        />

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

        <DeleteAccount isAdmin={user.role === 'ADMIN'} />
      </div>
    </Container>
  )
}

/** Excluir a conta: pede a senha de novo e explica o que some e o que fica. */
function DeleteAccount({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const mutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => navigate('/', { replace: true }),
  })
  const errors = fieldErrorsFrom(mutation.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate(password)
  }

  return (
    <section aria-labelledby="excluir-titulo" className="mt-16 border-t border-rule pt-10">
      <h2 id="excluir-titulo" className="font-display text-3xl leading-none font-normal">
        Excluir minha conta
      </h2>
      <p className="mt-3 text-muted">
        Apaga o seu perfil, e-mail, avaliações, comentários e presenças em shows. Não dá para desfazer. Os clipes e
        grupos que você sugeriu e que já foram aprovados continuam no site, sem o seu nome. Veja a{' '}
        <TextLink to="/privacidade">Política de privacidade</TextLink>.
      </p>

      {isAdmin ? (
        <p className="mt-4 font-medium">
          Administradores não podem excluir a própria conta. Peça a outro administrador para mudar o seu papel antes.
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 min-h-11 cursor-pointer font-semibold text-danger underline underline-offset-4"
        >
          Quero excluir minha conta
        </button>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col items-start gap-4">
          <FormAlert message={formMessageFrom(mutation.error)} />
          <TextField
            label="Digite sua senha para confirmar"
            type="password"
            name="delete-password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            className="w-full max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              variant="secondary"
              disabled={mutation.isPending || password === ''}
              className="border-danger text-danger hover:border-danger"
            >
              {mutation.isPending ? 'Excluindo…' : 'Excluir minha conta para sempre'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPassword('')
                mutation.reset()
              }}
              className="min-h-11 cursor-pointer font-semibold underline underline-offset-4"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
