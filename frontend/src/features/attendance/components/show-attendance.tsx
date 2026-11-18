import { Link } from 'react-router'
import { Button } from '../../../components/ui/button'
import { TextLink } from '../../../components/ui/text-link'
import { formMessageFrom } from '../../../lib/form-errors'
import { FormAlert } from '../../auth/components/form-alert'
import { useSession } from '../../auth/hooks/use-session'
import { useAttendance, useAttendanceActions, useMyAttendance } from '../hooks/use-attendance'

function countText(count: number): string {
  if (count === 0) {
    return 'Ninguém marcou presença ainda.'
  }
  return count === 1 ? '1 pessoa vai.' : `${count} pessoas vão.`
}

/**
 * "Eu vou": o total de quem marcou presença e o botão para marcar a sua. Os nomes ficam escondidos
 * por padrão: só aparecem os de quem marcou "mostrar meu nome".
 */
export function ShowAttendance({ slug, open }: { slug: string; open: boolean }) {
  const session = useSession()
  const summary = useAttendance(slug)

  return (
    <section aria-labelledby="eu-vou-titulo" className="border-t-2 border-ink pt-6">
      <h2 id="eu-vou-titulo" className="font-display text-3xl leading-none">
        Quem vai
      </h2>

      {summary.isPending ? (
        <p role="status" className="mt-4 text-muted">
          Carregando…
        </p>
      ) : summary.isError ? (
        <p className="mt-4 text-muted">Não foi possível carregar quem vai. Tente de novo em instantes.</p>
      ) : (
        <>
          <p className="mt-4 text-xl" aria-live="polite">
            {countText(summary.data.count)}
          </p>
          {summary.data.going.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {summary.data.going.map((person) => (
                <li key={person.username}>
                  <Link to={`/u/${person.username}`} className="underline underline-offset-4 hover:text-accent">
                    {person.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!open ? (
        <p className="mt-5 text-muted">A presença só pode ser marcada em shows que ainda vão acontecer.</p>
      ) : session.status === 'anonymous' ? (
        <p className="mt-5">
          <TextLink to="/entrar">Entre na sua conta</TextLink> ou <TextLink to="/cadastro">crie uma</TextLink> para
          marcar que você vai.
        </p>
      ) : session.status === 'authenticated' && session.user.needsEmailVerification ? (
        <p className="mt-5">Para marcar presença, confirme seu e-mail. Enviamos um link para {session.user.email}.</p>
      ) : session.status === 'authenticated' ? (
        <MemberControls slug={slug} />
      ) : null}
    </section>
  )
}

function MemberControls({ slug }: { slug: string }) {
  const mine = useMyAttendance(slug, true)
  const { set, remove } = useAttendanceActions(slug)
  const busy = set.isPending || remove.isPending

  if (mine.isPending) {
    return null
  }
  const going = mine.data?.going ?? false
  const showName = mine.data?.showName ?? false

  return (
    <div className="mt-5 flex flex-col items-start gap-4">
      <FormAlert message={formMessageFrom(set.error ?? remove.error)} />
      {going ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => remove.mutate()}>
          Desmarcar presença
        </Button>
      ) : (
        <Button type="button" disabled={busy} onClick={() => set.mutate(false)}>
          Eu vou
        </Button>
      )}
      {going && <p className="font-medium text-accent">Você vai a este show.</p>}
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-[#ffe600]"
          checked={showName}
          disabled={!going || busy}
          onChange={(event) => set.mutate(event.target.checked)}
        />
        <span>Mostrar meu nome na lista de quem vai</span>
      </label>
      <p className="max-w-prose text-sm text-muted">
        Por padrão, só o total aparece. Seu nome só entra na lista se você marcar esta opção.
      </p>
    </div>
  )
}
