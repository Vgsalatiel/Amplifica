import { Button } from '../../../components/ui/button'
import { FieldMessage } from '../../../components/ui/field-message'
import { cn } from '../../../lib/cn'
import type { FieldErrors } from '../../../lib/form-errors'
import { nextTrack, type TrackValues } from '../lib/forms'

interface TracksEditorProps {
  tracks: TrackValues[]
  onChange: (tracks: TrackValues[]) => void
  errors: FieldErrors
}

const cell =
  'h-11 w-full rounded-xs border border-rule-strong bg-transparent px-2 text-ink hover:border-ink aria-invalid:border-2 aria-invalid:border-danger'

/** Lista de faixas editável: uma linha por faixa, com disco, número, título e duração. */
export function TracksEditor({ tracks, onChange, errors }: TracksEditorProps) {
  const update = (index: number, patch: Partial<TrackValues>) =>
    onChange(tracks.map((track, position) => (position === index ? { ...track, ...patch } : track)))

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold">Faixas</legend>
      <FieldMessage id="tracks-error" error={errors.tracks} />

      {tracks.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma faixa ainda. Lançamentos sem faixas também são válidos.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {tracks.map((track, index) => {
            const rowError = (field: string) => errors[`tracks.${index}.${field}`]
            const label = (name: string) => `${name} da faixa ${index + 1}`
            return (
              <li
                key={track.key}
                className="grid grid-cols-[4.5rem_4.5rem_minmax(0,1fr)] items-end gap-3 border-b border-rule pb-4 md:grid-cols-[4.5rem_4.5rem_minmax(0,1fr)_7rem_auto]"
              >
                <Field label={label('Disco')} error={rowError('discNumber')}>
                  <input
                    inputMode="numeric"
                    value={track.discNumber}
                    onChange={(event) => update(index, { discNumber: event.target.value })}
                    aria-invalid={rowError('discNumber') ? true : undefined}
                    className={cell}
                  />
                </Field>
                <Field label={label('Número')} error={rowError('position')}>
                  <input
                    inputMode="numeric"
                    value={track.position}
                    onChange={(event) => update(index, { position: event.target.value })}
                    aria-invalid={rowError('position') ? true : undefined}
                    className={cell}
                  />
                </Field>
                <Field label={label('Título')} error={rowError('title')}>
                  <input
                    value={track.title}
                    onChange={(event) => update(index, { title: event.target.value })}
                    aria-invalid={rowError('title') ? true : undefined}
                    className={cell}
                  />
                </Field>
                <Field label={label('Duração')} error={rowError('durationMs')} className="col-span-2 md:col-span-1">
                  <input
                    value={track.duration}
                    onChange={(event) => update(index, { duration: event.target.value })}
                    placeholder="3:45"
                    aria-invalid={rowError('durationMs') ? true : undefined}
                    className={cell}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => onChange(tracks.filter((_, position) => position !== index))}
                  className="col-span-1 min-h-11 cursor-pointer self-end text-left text-sm font-semibold underline underline-offset-4 hover:text-accent md:col-auto"
                >
                  Remover faixa {index + 1}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <Button variant="secondary" className="self-start" onClick={() => onChange([...tracks, nextTrack(tracks)])}>
        Adicionar faixa
      </Button>
    </fieldset>
  )
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-danger">{error}</span>}
    </label>
  )
}
