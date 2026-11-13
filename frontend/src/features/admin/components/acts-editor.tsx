import { useQuery } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { FieldMessage } from '../../../components/ui/field-message'
import { TextField } from '../../../components/ui/text-field'
import { cn } from '../../../lib/cn'
import type { FieldErrors } from '../../../lib/form-errors'
import { listArtists } from '../../catalog/api/catalog-api'
import { moveAct, newAct, type ActValues } from '../lib/show-forms'

interface ActsEditorProps {
  acts: ActValues[]
  onChange: (acts: ActValues[]) => void
  errors: FieldErrors
}

const rowButton = 'min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4 hover:text-accent'

/** Enter dentro destes campos adiciona a banda, em vez de enviar o formulário inteiro. */
function onEnter(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      action()
    }
  }
}

/**
 * Escalação do show: a ordem importa (a primeira é a atração principal). Bandas do catálogo
 * entram pela busca e levam o link para a página delas; bandas de fora entram só pelo nome.
 */
export function ActsEditor({ acts, onChange, errors }: ActsEditorProps) {
  const [search, setSearch] = useState('')
  const [outsideName, setOutsideName] = useState('')
  const term = search.trim()

  const results = useQuery({
    queryKey: ['artists', 'picker', term],
    queryFn: () => listArtists({ q: term, limit: 8 }),
    enabled: term.length >= 2,
  })
  const linked = new Set(acts.map((act) => act.artistId))
  const available = results.data?.items.filter((artist) => !linked.has(artist.id)) ?? []

  function addFromCatalog(artist: { id: string; name: string }) {
    onChange([...acts, newAct(artist.name, artist.id)])
    setSearch('')
  }

  function addOutside() {
    const name = outsideName.trim()
    if (name) {
      onChange([...acts, newAct(name)])
      setOutsideName('')
    }
  }

  const update = (index: number, patch: Partial<ActValues>) =>
    onChange(acts.map((act, position) => (position === index ? { ...act, ...patch } : act)))

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold">Bandas</legend>
      <FieldMessage id="acts-error" error={errors.acts} />

      {acts.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma banda ainda. A primeira que você adicionar é a atração principal.</p>
      ) : (
        <ol className="divide-y divide-rule border-y border-rule">
          {acts.map((act, index) => {
            const error = errors[`acts.${index}.name`]
            return (
              <li key={act.key} className="flex flex-wrap items-end gap-x-4 gap-y-2 py-3">
                <div className="flex min-w-48 flex-1 flex-col gap-1">
                  <label htmlFor={`act-${act.key}`} className="text-sm font-semibold">
                    Nome da banda {index + 1}
                  </label>
                  <input
                    id={`act-${act.key}`}
                    value={act.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    aria-invalid={error ? true : undefined}
                    className={cn(
                      'h-11 rounded-xs border bg-transparent px-3 text-ink',
                      error ? 'border-2 border-danger' : 'border-rule-strong hover:border-ink',
                    )}
                  />
                  <FieldMessage
                    id={`act-${act.key}-message`}
                    error={error}
                    hint={act.artistId ? 'No catálogo: o show liga à página da banda.' : 'Fora do catálogo.'}
                  />
                </div>
                <button
                  type="button"
                  className={rowButton}
                  disabled={index === 0}
                  onClick={() => onChange(moveAct(acts, index, -1))}
                >
                  Subir banda {index + 1}
                </button>
                <button
                  type="button"
                  className={rowButton}
                  disabled={index === acts.length - 1}
                  onClick={() => onChange(moveAct(acts, index, 1))}
                >
                  Descer banda {index + 1}
                </button>
                <button
                  type="button"
                  className={rowButton}
                  onClick={() => onChange(acts.filter((_, position) => position !== index))}
                >
                  Remover banda {index + 1}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <TextField
        label="Buscar banda do catálogo"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={onEnter(() => undefined)}
        placeholder="Digite ao menos duas letras"
      />
      {term.length >= 2 && (
        <div aria-live="polite">
          {results.isPending ? (
            <p className="text-sm text-muted">Buscando…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhuma banda do catálogo com esse nome. Use o campo abaixo para bandas de fora.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {available.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    onClick={() => addFromCatalog(artist)}
                    className="min-h-11 cursor-pointer border border-rule-strong px-3 text-sm font-medium hover:border-accent hover:text-accent"
                  >
                    Adicionar {artist.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <TextField
          label="Banda de fora do catálogo"
          value={outsideName}
          onChange={(event) => setOutsideName(event.target.value)}
          onKeyDown={onEnter(addOutside)}
          className="min-w-48 flex-1"
        />
        <Button type="button" variant="secondary" onClick={addOutside} disabled={outsideName.trim() === ''}>
          Adicionar banda de fora
        </Button>
      </div>
    </fieldset>
  )
}
