import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { Select } from '../../../components/ui/select'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom, type FieldErrors } from '../../../lib/form-errors'
import { ApiError } from '../../../lib/http'
import { SHOW_STATUS_LABELS } from '../../../lib/labels'
import { STATES } from '../../../lib/states'
import type { Show } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { createShow, deleteShow, updateShow, type ShowInput } from '../../shows/api/shows-api'
import { useInvalidateShows, useShow } from '../../shows/hooks/use-shows'
import { ActsEditor } from '../components/acts-editor'
import { GenreChecklist } from '../components/genre-checklist'
import { ImportFromLink } from '../components/import-from-link'
import { applyImportPreview, buildShowPayload, showToValues, type ShowFormValues } from '../lib/show-forms'

export function NewShowPage() {
  return <ShowEditor />
}

export function EditShowPage() {
  const { slug = '' } = useParams()
  const show = useShow(slug)

  if (show.isPending) {
    return <p className="text-muted">Carregando show…</p>
  }
  if (show.isError) {
    const notFound = show.error instanceof ApiError && show.error.status === 404
    return (
      <div>
        <p role="alert" className="font-medium text-danger">
          {notFound ? 'Esse show não existe.' : 'Não foi possível carregar o show.'}
        </p>
        <p className="mt-4">
          <TextLink to="/admin/shows">Voltar para a lista de shows</TextLink>
        </p>
      </div>
    )
  }
  return <ShowEditor key={show.data.id} show={show.data} />
}

function ShowEditor({ show }: { show?: Show }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateShows()
  const [values, setValues] = useState<ShowFormValues>(() => showToValues(show))
  const [localErrors, setLocalErrors] = useState<FieldErrors>({})
  const [saved, setSaved] = useState(false)
  const justCreated = (location.state as { created?: boolean } | null)?.created === true

  const save = useMutation({
    mutationFn: (input: ShowInput) => (show ? updateShow(show.id, input) : createShow(input)),
    onSuccess: (result) => {
      queryClient.setQueryData(['show', result.slug], result)
      void invalidate()
      setSaved(true)
      if (!show) {
        void navigate(`/admin/shows/${result.slug}`, {
          replace: true,
          state: { created: true },
        })
      } else if (result.slug !== show.slug) {
        void navigate(`/admin/shows/${result.slug}`, { replace: true })
      }
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteShow(show!.id),
    onSuccess: () => {
      void invalidate()
      void navigate('/admin/shows', { replace: true })
    },
  })

  const errors = { ...fieldErrorsFrom(save.error), ...localErrors }
  const set = <K extends keyof ShowFormValues>(field: K, value: ShowFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setLocalErrors({})
    setSaved(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    const built = buildShowPayload(values)
    if ('errors' in built) {
      setLocalErrors(built.errors)
      return
    }
    setLocalErrors({})
    save.mutate(built.payload)
  }

  const title = show ? (show.name ?? show.acts.map((act) => act.name).join(', ')) : 'Novo show'

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h2 className="font-display text-4xl leading-none font-normal italic">{title}</h2>
      {!show && (
        <ImportFromLink
          onImport={(preview) => {
            setValues((current) => applyImportPreview(current, preview))
            setLocalErrors({})
            setSaved(false)
          }}
        />
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {justCreated && (
          <p role="status" className="border-l-4 border-accent bg-surface-raised px-4 py-3 font-medium">
            Show criado.
          </p>
        )}
        <FormAlert message={formMessageFrom(save.error)} />

        <ActsEditor acts={values.acts} onChange={(acts) => set('acts', acts)} errors={errors} />

        <TextField
          label="Nome do evento"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          hint="Só para festivais e turnês, como “Knotfest Brasil”. Show comum fica sem nome."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="Data"
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <TextField
            label="Horário de início"
            type="time"
            value={values.startTime}
            onChange={(e) => set('startTime', e.target.value)}
            error={errors.startTime}
            hint="Deixe vazio se não foi divulgado."
          />
        </div>

        <TextField
          label="Local"
          value={values.venue}
          onChange={(e) => set('venue', e.target.value)}
          error={errors.venue}
        />

        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
          <TextField
            label="Cidade"
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            error={errors.city}
          />
          <Select
            label="Estado"
            value={values.state}
            onChange={(e) => set('state', e.target.value)}
            error={errors.state}
          >
            <option value="">Escolha</option>
            {STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name} ({state.code})
              </option>
            ))}
          </Select>
        </div>

        <TextField
          label="Link oficial"
          value={values.ticketUrl}
          onChange={(e) => set('ticketUrl', e.target.value)}
          error={errors.ticketUrl}
          hint="Página do evento ou do vendedor de ingressos. Deixe vazio se ainda não há."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            label="Situação"
            value={values.status}
            onChange={(e) => set('status', e.target.value as ShowFormValues['status'])}
            error={errors.status}
          >
            {Object.entries(SHOW_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <TextField
            label="Conferido em"
            type="date"
            value={values.verifiedAt}
            onChange={(e) => set('verifiedAt', e.target.value)}
            error={errors.verifiedAt}
            hint="Dia em que você confirmou estas informações na fonte. Aparece para quem visita o site."
          />
        </div>

        <GenreChecklist value={values.genreIds} onChange={(ids) => set('genreIds', ids)} error={errors.genreIds} />

        <TextField
          label="Endereço"
          value={values.slug}
          onChange={(e) => set('slug', e.target.value)}
          error={errors.slug}
          hint="Opcional. Se ficar vazio, é gerado a partir da banda, da cidade e da data."
        />

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : show ? 'Salvar alterações' : 'Criar show'}
          </Button>
          <p aria-live="polite" className="text-muted">
            {saved && !save.isPending && show ? 'Alterações salvas.' : ''}
          </p>
        </div>

        {show && (
          <div className="mt-6 border-t border-rule pt-6">
            <FormAlert message={remove.error ? formMessageFrom(remove.error) : null} />
            <DeleteButton subject={`o show ${title}`} pending={remove.isPending} onConfirm={() => remove.mutate()} />
          </div>
        )}
      </form>
    </div>
  )
}
