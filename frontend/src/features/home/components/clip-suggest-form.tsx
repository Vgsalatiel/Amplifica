import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import { useSession } from '../../auth/hooks/use-session'
import { FormAlert } from '../../auth/components/form-alert'
import { useMyClips, useSuggestClip } from '../../clips/hooks/use-clips'
import type { ClipStatus } from '../../../types/api'

const STATUS_LABELS: Record<ClipStatus, string> = {
  PENDING: 'aguardando aprovação',
  APPROVED: 'na playlist',
  REJECTED: 'não aprovado',
}

/**
 * Sugerir um clipe para a playlist. Quem tem conta com e-mail confirmado cola o link do YouTube; o
 * clipe só entra depois que um administrador aprovar. Visitantes e contas sem e-mail confirmado veem
 * o que falta para sugerir, no mesmo espírito do formulário de avaliação.
 */
export function ClipSuggestForm() {
  const session = useSession()

  return (
    <section aria-labelledby="sugerir-titulo" className="mt-6 border-t border-rule pt-5">
      <h3 id="sugerir-titulo" className="font-display text-xl leading-none">
        Sugira um clipe
      </h3>
      <p className="mt-2 text-sm text-muted">
        Descobriu uma banda nova? Mande o clipe dela. Depois de aprovado, ele entra na playlist.
      </p>

      {session.status === 'anonymous' ? (
        <p className="mt-4">
          <TextLink to="/entrar">Entre na sua conta</TextLink> ou <TextLink to="/cadastro">crie uma</TextLink> para
          sugerir um clipe.
        </p>
      ) : session.status === 'authenticated' && session.user.needsEmailVerification ? (
        <p className="mt-4">Para sugerir clipes, confirme seu e-mail. Enviamos um link para {session.user.email}.</p>
      ) : session.status === 'authenticated' ? (
        <MemberForm key={session.user.id} />
      ) : null}
    </section>
  )
}

function MemberForm() {
  const [url, setUrl] = useState('')
  const suggest = useSuggestClip()
  const mine = useMyClips(true)
  const errors = fieldErrorsFrom(suggest.error)
  const pending = (mine.data ?? []).filter((clip) => clip.status === 'PENDING')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    suggest.mutate(url.trim(), { onSuccess: () => setUrl('') })
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
        <FormAlert message={formMessageFrom(suggest.error)} />
        <div className="flex flex-wrap items-start gap-3">
          <TextField
            label="Link do clipe no YouTube"
            type="url"
            name="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            error={errors.url}
            className="min-w-60 flex-1"
          />
          <Button type="submit" disabled={suggest.isPending || url.trim() === ''} className="mt-7">
            {suggest.isPending ? 'Enviando…' : 'Sugerir clipe'}
          </Button>
        </div>
        <p role="status" className="font-medium text-accent">
          {suggest.isSuccess ? 'Enviado! Ele entra na playlist depois que um administrador aprovar.' : ''}
        </p>
      </form>

      {pending.length > 0 && (
        <div className="mt-3 text-sm text-muted">
          <p>Suas sugestões {STATUS_LABELS.PENDING}:</p>
          <ul className="mt-1 list-disc pl-5">
            {pending.map((clip) => (
              <li key={clip.id}>{clip.title}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
