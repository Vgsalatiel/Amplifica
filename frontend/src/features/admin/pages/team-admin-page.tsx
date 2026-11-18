import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import type { TeamMember } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useSetTeamRole, useTeam } from '../../team/hooks/use-team'

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  ADMIN: 'Administrador',
  MODERATOR: 'Moderador',
}

/**
 * A equipe do site. Moderadores cuidam do que a comunidade produz (clipes sugeridos, e depois
 * comentários e denúncias), sem mexer no catálogo. O papel de administrador não muda por aqui.
 */
export function TeamAdminPage() {
  const team = useTeam()
  const setRole = useSetTeamRole()
  const [username, setUsername] = useState('')
  const [notice, setNotice] = useState('')
  const errors = fieldErrorsFrom(setRole.error)

  function promote(event: FormEvent) {
    event.preventDefault()
    const name = username.trim()
    setNotice('')
    setRole.mutate(
      { username: name, role: 'MODERATOR' },
      {
        onSuccess: (member) => {
          setUsername('')
          setNotice(`@${member.username} agora é moderador.`)
        },
      },
    )
  }

  function demote(member: TeamMember) {
    setNotice('')
    setRole.mutate(
      { username: member.username, role: 'USER' },
      { onSuccess: () => setNotice(`@${member.username} voltou a ser usuário comum.`) },
    )
  }

  return (
    <section aria-labelledby="team-title">
      <h2 id="team-title" className="font-display text-4xl leading-none font-normal italic">
        Equipe
      </h2>
      <p className="mt-3 max-w-2xl text-muted">
        Moderadores aprovam e recusam o que a comunidade envia, mas não mexem no catálogo nem na agenda. A pessoa
        precisa ter conta e e-mail confirmado. Depois de promovida, pode ser que ela precise recarregar a página para
        ver o menu "Moderação".
      </p>

      <form onSubmit={promote} noValidate className="mt-8 flex max-w-xl flex-col gap-3">
        <FormAlert message={formMessageFrom(setRole.error)} />
        <div className="flex flex-wrap items-start gap-3">
          <TextField
            label="Nome de usuário"
            name="username"
            placeholder="@ana"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={errors.username}
            className="min-w-56 flex-1"
          />
          <Button type="submit" disabled={setRole.isPending || username.trim() === ''} className="mt-7">
            Tornar moderador
          </Button>
        </div>
      </form>

      <p role="status" className="mt-4 min-h-6 font-medium text-accent">
        {notice}
      </p>

      {team.isPending ? (
        <p className="mt-4 text-muted">Carregando a equipe…</p>
      ) : team.isError ? (
        <p role="alert" className="mt-4 font-medium text-danger">
          Não foi possível carregar a equipe.
        </p>
      ) : (
        <ul aria-label="Equipe" className="mt-2 divide-y divide-rule border-y border-rule">
          {team.data.map((member) => (
            <li key={member.username} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <span className="min-w-0">
                <span className="block font-bold">{member.displayName}</span>
                <span className="block text-sm text-muted">
                  @{member.username} · {ROLE_LABELS[member.role]}
                </span>
              </span>
              {member.role === 'MODERATOR' && (
                <Button
                  variant="secondary"
                  disabled={setRole.isPending}
                  onClick={() => demote(member)}
                  aria-label={`Tirar o papel de moderador de @${member.username}`}
                  className="h-11 px-6"
                >
                  Tirar o papel
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
