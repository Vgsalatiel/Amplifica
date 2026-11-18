import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { GROUP_PLATFORM_LABELS } from '../../../lib/labels'
import type { ShowGroup } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { useSession } from '../../auth/hooks/use-session'
import { useDeleteGroup, useGroups, useSuggestGroup } from '../hooks/use-groups'

/**
 * Grupos de WhatsApp, Telegram ou Discord de quem vai ao show. Os grupos são externos: o Amplifica
 * não os administra. Qualquer conta com e-mail confirmado sugere um; só aparece depois que a
 * moderação aprova.
 */
export function ShowGroups({ slug, open }: { slug: string; open: boolean }) {
  const session = useSession()
  const groups = useGroups(slug)

  return (
    <section aria-labelledby="grupos-titulo" className="border-t-2 border-ink pt-6">
      <h2 id="grupos-titulo" className="font-display text-3xl leading-none">
        Grupos
      </h2>
      <p className="mt-3 max-w-prose text-sm text-muted">
        Grupos criados por outras pessoas para combinar o rolê. Ficam fora do Amplifica e não são administrados por
        nós: entre só se quiser e não passe dados pessoais.
      </p>

      {groups.isPending ? (
        <p role="status" className="mt-4 text-muted">
          Carregando…
        </p>
      ) : groups.isError ? (
        <p className="mt-4 text-muted">Não foi possível carregar os grupos. Tente de novo em instantes.</p>
      ) : groups.data.length === 0 ? (
        <p className="mt-4 text-muted">Nenhum grupo aprovado para este show ainda.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {groups.data.map((group) => (
            <GroupItem key={group.id} group={group} />
          ))}
        </ul>
      )}

      {!open ? null : session.status === 'anonymous' ? (
        <p className="mt-5">
          <TextLink to="/entrar">Entre na sua conta</TextLink> ou <TextLink to="/cadastro">crie uma</TextLink> para
          sugerir um grupo.
        </p>
      ) : session.status === 'authenticated' && session.user.needsEmailVerification ? (
        <p className="mt-5">Para sugerir um grupo, confirme seu e-mail. Enviamos um link para {session.user.email}.</p>
      ) : session.status === 'authenticated' ? (
        <SuggestForm slug={slug} trusted={session.user.role !== 'USER'} />
      ) : null}
    </section>
  )
}

function GroupItem({ group }: { group: ShowGroup }) {
  const session = useSession()
  const remove = useDeleteGroup()
  const canModerate =
    session.status === 'authenticated' && (session.user.role === 'ADMIN' || session.user.role === 'MODERATOR')
  const label = GROUP_PLATFORM_LABELS[group.platform]

  return (
    <li className="flex flex-wrap items-center gap-x-5">
      <a
        href={group.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold transition-colors hover:border-accent hover:text-accent"
      >
        Grupo no {label}
        <span className="sr-only"> (link externo, abre em outra aba)</span>
      </a>
      {canModerate && (
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate(group.id)}
          className="min-h-11 cursor-pointer text-sm font-semibold text-danger underline underline-offset-4"
        >
          Remover grupo do {label}
        </button>
      )}
    </li>
  )
}

function SuggestForm({ slug, trusted }: { slug: string; trusted: boolean }) {
  const [url, setUrl] = useState('')
  const suggest = useSuggestGroup(slug)
  const errors = fieldErrorsFrom(suggest.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    suggest.mutate(url.trim(), { onSuccess: () => setUrl('') })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-3">
      <FormAlert message={formMessageFrom(suggest.error)} />
      <div className="flex flex-wrap items-start gap-3">
        <TextField
          label="Link de convite do grupo"
          type="url"
          name="group-url"
          inputMode="url"
          placeholder="https://chat.whatsapp.com/…"
          hint="WhatsApp, Telegram ou Discord."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          error={errors.url}
          className="min-w-60 flex-1"
        />
        <Button type="submit" disabled={suggest.isPending || url.trim() === ''} className="mt-7">
          {suggest.isPending ? 'Enviando…' : 'Sugerir grupo'}
        </Button>
      </div>
      <p role="status" className="font-medium text-accent">
        {suggest.isSuccess
          ? trusted
            ? 'Grupo publicado.'
            : 'Enviado! Ele aparece aqui depois que a moderação aprovar.'
          : ''}
      </p>
    </form>
  )
}
