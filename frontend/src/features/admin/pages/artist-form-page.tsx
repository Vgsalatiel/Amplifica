import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { Select } from '../../../components/ui/select'
import { TextArea } from '../../../components/ui/text-area'
import { TextField } from '../../../components/ui/text-field'
import { TextLink } from '../../../components/ui/text-link'
import { fieldErrorsFrom, formMessageFrom, type FieldErrors } from '../../../lib/form-errors'
import { ApiError } from '../../../lib/http'
import type { ArtistDetail } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import {
  createArtist,
  deleteArtist,
  removeArtistImage,
  updateArtist,
  uploadArtistImage,
  type ArtistInput,
} from '../../catalog/api/catalog-api'
import { useArtist, useGenreTree, useInvalidateCatalog } from '../../catalog/hooks/use-catalog'
import { flattenGenres } from '../../catalog/lib/genre-options'
import { ImageUploader } from '../components/image-uploader'
import { ARTIST_TYPE_LABELS, artistToValues, buildArtistPayload, type ArtistFormValues } from '../lib/forms'

export function NewArtistPage() {
  return <ArtistEditor />
}

export function EditArtistPage() {
  const { slug = '' } = useParams()
  const artist = useArtist(slug)

  if (artist.isPending) {
    return <p className="text-muted">Carregando artista…</p>
  }
  if (artist.isError) {
    const notFound = artist.error instanceof ApiError && artist.error.status === 404
    return (
      <div>
        <p role="alert" className="font-medium text-danger">
          {notFound ? 'Esse artista não existe.' : 'Não foi possível carregar o artista.'}
        </p>
        <p className="mt-4">
          <TextLink to="/admin/artistas">Voltar para a lista de artistas</TextLink>
        </p>
      </div>
    )
  }
  // A `key` reinicia o formulário se a pessoa passar de um artista para outro.
  return <ArtistEditor key={artist.data.id} artist={artist.data} />
}

function ArtistEditor({ artist }: { artist?: ArtistDetail }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCatalog()
  const genres = useGenreTree()
  const [values, setValues] = useState<ArtistFormValues>(() => artistToValues(artist))
  const [localErrors, setLocalErrors] = useState<FieldErrors>({})
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (input: ArtistInput) =>
      artist ? updateArtist(artist.id, input) : createArtist(input),
    onSuccess: (result) => {
      void invalidate()
      setSaved(true)
      if (!artist || result.slug !== artist.slug) {
        void navigate(`/admin/artistas/${result.slug}`, { replace: true })
      }
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteArtist(artist!.id),
    onSuccess: () => {
      void invalidate()
      void navigate('/admin/artistas', { replace: true })
    },
  })

  const storeImage = (updated: { image: ArtistDetail['image'] }) => {
    queryClient.setQueryData(['artist', artist!.slug], (current: ArtistDetail | undefined) =>
      current ? { ...current, image: updated.image } : current,
    )
    void invalidate()
  }
  const upload = useMutation({ mutationFn: (file: File) => uploadArtistImage(artist!.id, file), onSuccess: storeImage })
  const removeImage = useMutation({ mutationFn: () => removeArtistImage(artist!.id), onSuccess: storeImage })

  const errors = { ...fieldErrorsFrom(save.error), ...localErrors }
  const set = <K extends keyof ArtistFormValues>(field: K, value: ArtistFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setLocalErrors({})
    setSaved(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    const built = buildArtistPayload(values)
    if ('errors' in built) {
      setLocalErrors(built.errors)
      return
    }
    setLocalErrors({})
    save.mutate(built.payload)
  }

  const genreOptions = genres.data ? flattenGenres(genres.data) : []
  const imageError = [upload.error, removeImage.error].find(Boolean)

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_16rem]">
      <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-6">
        <h2 className="font-display text-4xl leading-none font-normal italic">
          {artist ? artist.name : 'Novo artista'}
        </h2>
        <FormAlert message={formMessageFrom(save.error)} />

        <TextField label="Nome" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextField
          label="Endereço"
          value={values.slug}
          onChange={(e) => set('slug', e.target.value)}
          error={errors.slug}
          hint="Opcional. Aparece na URL do artista. Se ficar vazio, é gerado a partir do nome."
        />
        <Select
          label="Tipo"
          value={values.type}
          onChange={(e) => set('type', e.target.value as ArtistFormValues['type'])}
          error={errors.type}
        >
          {Object.entries(ARTIST_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label="País"
            value={values.country}
            onChange={(e) => set('country', e.target.value)}
            error={errors.country}
            maxLength={2}
            hint="Código de duas letras, como BR."
          />
          <TextField label="Cidade" value={values.city} onChange={(e) => set('city', e.target.value)} error={errors.city} />
          <TextField
            label="Ano de formação"
            inputMode="numeric"
            value={values.formedYear}
            onChange={(e) => set('formedYear', e.target.value)}
            error={errors.formedYear}
          />
          <TextField
            label="Ano de encerramento"
            inputMode="numeric"
            value={values.disbandedYear}
            onChange={(e) => set('disbandedYear', e.target.value)}
            error={errors.disbandedYear}
            hint="Deixe vazio se está em atividade."
          />
        </div>

        <TextArea label="Bio" rows={6} value={values.bio} onChange={(e) => set('bio', e.target.value)} error={errors.bio} />

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-sm font-semibold">Gêneros</legend>
          {genres.isPending ? (
            <p className="text-sm text-muted">Carregando gêneros…</p>
          ) : genreOptions.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum gênero cadastrado. <TextLink to="/admin/generos">Cadastre gêneros primeiro</TextLink>.
            </p>
          ) : (
            genreOptions.map((option) => (
              <label
                key={option.id}
                className="flex min-h-9 cursor-pointer items-center gap-3"
                style={{ paddingLeft: `${option.depth * 1.5}rem` }}
              >
                <input
                  type="checkbox"
                  className="size-5 accent-accent"
                  checked={values.genreIds.includes(option.id)}
                  onChange={(event) =>
                    set(
                      'genreIds',
                      event.target.checked
                        ? [...values.genreIds, option.id]
                        : values.genreIds.filter((id) => id !== option.id),
                    )
                  }
                />
                {option.name}
              </label>
            ))
          )}
          {errors.genreIds && <p className="mt-1 text-sm font-medium text-danger">{errors.genreIds}</p>}
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : artist ? 'Salvar alterações' : 'Criar artista'}
          </Button>
          <p aria-live="polite" className="text-muted">
            {saved && !save.isPending ? 'Alterações salvas.' : ''}
          </p>
        </div>

        {artist && (
          <div className="mt-6 border-t border-rule pt-6">
            <FormAlert message={remove.error ? formMessageFrom(remove.error) : null} />
            <div className="mt-3">
              <DeleteButton subject={`o artista ${artist.name}`} pending={remove.isPending} onConfirm={() => remove.mutate()} />
            </div>
          </div>
        )}
      </form>

      <aside>
        {artist ? (
          <ImageUploader
            label="Foto"
            description="JPEG, PNG ou WebP, até 5 MB."
            image={artist.image}
            onUpload={(file) => upload.mutate(file)}
            onRemove={() => removeImage.mutate()}
            pending={upload.isPending || removeImage.isPending}
            error={imageError ? (imageError instanceof ApiError ? imageError.message : 'Não foi possível falar com o servidor.') : null}
          />
        ) : (
          <p className="text-sm text-muted">Salve o artista para poder enviar a foto.</p>
        )}
      </aside>
    </div>
  )
}
