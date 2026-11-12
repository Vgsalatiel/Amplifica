import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { Select } from '../../../components/ui/select'
import { TextArea } from '../../../components/ui/text-area'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom, type FieldErrors } from '../../../lib/form-errors'
import { ApiError } from '../../../lib/http'
import type { ReleaseDetail } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { createRelease, deleteRelease, updateRelease, type ReleaseInput } from '../../catalog/api/catalog-api'
import { useInvalidateCatalog, useRelease } from '../../catalog/hooks/use-catalog'
import { ArtistPicker } from '../components/artist-picker'
import { CoverPanel } from '../components/cover-panel'
import { TracksEditor } from '../components/tracks-editor'
import {
  RELEASE_TYPE_LABELS,
  buildReleasePayload,
  releaseToValues,
  type ReleaseFormValues,
} from '../lib/forms'

export function NewReleasePage() {
  return <ReleaseEditor />
}

export function EditReleasePage() {
  const { slug = '' } = useParams()
  const release = useRelease(slug)

  if (release.isPending) {
    return <p className="text-muted">Carregando lançamento…</p>
  }
  if (release.isError) {
    const notFound = release.error instanceof ApiError && release.error.status === 404
    return (
      <div>
        <p role="alert" className="font-medium text-danger">
          {notFound ? 'Esse lançamento não existe.' : 'Não foi possível carregar o lançamento.'}
        </p>
        <p className="mt-4">
          <TextLink to="/admin/lancamentos">Voltar para a lista de lançamentos</TextLink>
        </p>
      </div>
    )
  }
  return <ReleaseEditor key={release.data.id} release={release.data} />
}

function ReleaseEditor({ release }: { release?: ReleaseDetail }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  const [values, setValues] = useState<ReleaseFormValues>(() => releaseToValues(release))
  const [localErrors, setLocalErrors] = useState<FieldErrors>({})
  const [saved, setSaved] = useState(false)
  const justCreated = (location.state as { created?: boolean } | null)?.created === true

  const save = useMutation({
    mutationFn: (input: ReleaseInput) =>
      release ? updateRelease(release.id, input) : createRelease(input),
    onSuccess: (result) => {
      queryClient.setQueryData(['release', result.slug], result)
      void invalidate()
      setSaved(true)
      if (!release) {
        // Depois de criar, a pessoa vai para a edição, onde a capa pode ser enviada.
        void navigate(`/admin/lancamentos/${result.slug}`, { replace: true, state: { created: true } })
      } else if (result.slug !== release.slug) {
        void navigate(`/admin/lancamentos/${result.slug}`, { replace: true })
      }
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteRelease(release!.id),
    onSuccess: () => {
      void invalidate()
      void navigate('/admin/lancamentos', { replace: true })
    },
  })

  const errors = { ...fieldErrorsFrom(save.error), ...localErrors }
  const set = <K extends keyof ReleaseFormValues>(field: K, value: ReleaseFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setLocalErrors({})
    setSaved(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    const built = buildReleasePayload(values)
    if ('errors' in built) {
      setLocalErrors(built.errors)
      return
    }
    setLocalErrors({})
    save.mutate(built.payload)
  }

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={handleSubmit} noValidate className="flex max-w-3xl flex-col gap-6">
        <h2 className="font-display text-4xl leading-none font-normal italic">
          {release ? release.title : 'Novo lançamento'}
        </h2>
        {justCreated && (
          <p role="status" className="border-l-4 border-accent bg-surface-raised px-4 py-3 font-medium">
            Lançamento criado. Agora você pode enviar a capa, ao lado.
          </p>
        )}
        <FormAlert message={formMessageFrom(save.error)} />

        <TextField label="Título" value={values.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />

        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            label="Tipo"
            value={values.type}
            onChange={(e) => set('type', e.target.value as ReleaseFormValues['type'])}
            error={errors.type}
          >
            {Object.entries(RELEASE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <TextField
            label="Data de lançamento"
            value={values.releaseDate}
            onChange={(e) => set('releaseDate', e.target.value)}
            error={errors.releaseDate}
            placeholder="2024-06-14"
            hint="Digite só o que se sabe: 2024, 2024-06 ou 2024-06-14."
          />
        </div>

        <ArtistPicker value={values.artists} onChange={(artists) => set('artists', artists)} error={errors.artists} />

        <TextField
          label="Vídeo no YouTube"
          value={values.youtube}
          onChange={(e) => set('youtube', e.target.value)}
          error={errors.youtube}
          hint="Cole o link do vídeo. Deixe vazio para não mostrar vídeo."
        />

        <TextArea
          label="Descrição"
          rows={5}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
        />

        <TextField
          label="Endereço"
          value={values.slug}
          onChange={(e) => set('slug', e.target.value)}
          error={errors.slug}
          hint="Opcional. Se ficar vazio, é gerado a partir do artista e do título."
        />

        <TracksEditor tracks={values.tracks} onChange={(tracks) => set('tracks', tracks)} errors={errors} />

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : release ? 'Salvar alterações' : 'Criar lançamento'}
          </Button>
          <p aria-live="polite" className="text-muted">
            {saved && !save.isPending && release ? 'Alterações salvas.' : ''}
          </p>
        </div>

        {release && (
          <div className="mt-6 border-t border-rule pt-6">
            <FormAlert message={remove.error ? formMessageFrom(remove.error) : null} />
            <div className="mt-3">
              <DeleteButton
                subject={`o lançamento ${release.title}`}
                pending={remove.isPending}
                onConfirm={() => remove.mutate()}
              />
            </div>
          </div>
        )}
      </form>

      <aside>
        {release ? (
          <CoverPanel release={release} />
        ) : (
          <p className="text-sm text-muted">Salve o lançamento para poder enviar a capa e escolher a cor da página.</p>
        )}
      </aside>
    </div>
  )
}
