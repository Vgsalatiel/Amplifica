import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/button'
import { DeleteButton } from '../../../components/ui/delete-button'
import { Select } from '../../../components/ui/select'
import { TextArea } from '../../../components/ui/text-area'
import { TextField } from '../../../components/ui/text-field'
import { fieldErrorsFrom, formMessageFrom } from '../../../lib/form-errors'
import type { GenreItem } from '../../../types/api'
import { FormAlert } from '../../auth/components/form-alert'
import { createGenre, deleteGenre, updateGenre, type GenreInput } from '../../catalog/api/catalog-api'
import { useGenreTree, useInvalidateCatalog } from '../../catalog/hooks/use-catalog'
import { flattenGenres, idsWithDescendants } from '../../catalog/lib/genre-options'

interface GenreFormValues {
  name: string
  slug: string
  description: string
  parentId: string
}

const EMPTY: GenreFormValues = { name: '', slug: '', description: '', parentId: '' }

export function GenresAdminPage() {
  const tree = useGenreTree()
  const invalidate = useInvalidateCatalog()
  const [editing, setEditing] = useState<GenreItem | null>(null)
  const [values, setValues] = useState<GenreFormValues>(EMPTY)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (input: GenreInput) => (editing ? updateGenre(editing.id, input) : createGenre(input)),
    onSuccess: () => {
      void invalidate()
      reset()
      setSaved(true)
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteGenre(id),
    onSuccess: () => void invalidate(),
  })

  function reset() {
    save.reset()
    setEditing(null)
    setValues(EMPTY)
  }

  function startEditing(genre: GenreItem) {
    save.reset()
    remove.reset()
    setSaved(false)
    setEditing(genre)
    setValues({
      name: genre.name,
      slug: genre.slug,
      description: genre.description ?? '',
      parentId: genre.parentId ?? '',
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    const slug = values.slug.trim()
    save.mutate({
      name: values.name.trim(),
      ...(slug && { slug }),
      description: values.description,
      parentId: values.parentId || null,
    })
  }

  const options = tree.data ? flattenGenres(tree.data) : []
  // Ao editar, o gênero não pode ser colocado dentro dele mesmo nem de um subgênero seu.
  const blocked = editing && tree.data ? idsWithDescendants(tree.data, editing.id) : new Set<string>()
  const errors = fieldErrorsFrom(save.error)
  const set = (field: keyof GenreFormValues) => (value: string) => setValues((current) => ({ ...current, [field]: value }))

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="genres-title">
        <h2 id="genres-title" className="font-display text-4xl leading-none font-normal italic">
          Gêneros
        </h2>
        <p className="mt-3 max-w-xl text-muted">
          Gêneros e subgêneros formam uma árvore. Quem filtra por um gênero vê também os artistas dos seus subgêneros.
        </p>

        <div className="mt-6">
          <FormAlert message={remove.error ? formMessageFrom(remove.error) : null} />
        </div>

        {tree.isPending ? (
          <p className="mt-6 text-muted">Carregando gêneros…</p>
        ) : tree.isError ? (
          <p role="alert" className="mt-6 font-medium text-danger">
            Não foi possível carregar os gêneros.
          </p>
        ) : options.length === 0 ? (
          <p className="mt-6 text-muted">
            Nenhum gênero cadastrado. Crie o primeiro ao lado, ou rode <code>npm run seed:genres</code> no backend.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {options.map((option) => {
              const genre = findGenre(tree.data, option.id)
              return (
                <li key={option.id} className="flex flex-wrap items-center gap-x-4 py-1.5">
                  <span className="min-w-0 flex-1 py-2 font-medium" style={{ paddingLeft: `${option.depth * 1.5}rem` }}>
                    {option.depth > 0 && <span aria-hidden="true" className="mr-2 text-muted">└</span>}
                    {option.name}
                  </span>
                  {genre && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(genre)}
                        className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4 hover:text-accent"
                        aria-label={`Editar ${genre.name}`}
                      >
                        Editar
                      </button>
                      <DeleteButton
                        subject={`o gênero ${genre.name}`}
                        pending={remove.isPending && remove.variables === genre.id}
                        onConfirm={() => {
                          setSaved(false)
                          remove.mutate(genre.id)
                        }}
                      />
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 self-start border border-rule p-6">
        <h2 className="font-display text-3xl leading-none font-normal italic">
          {editing ? `Editar ${editing.name}` : 'Novo gênero'}
        </h2>
        <FormAlert message={formMessageFrom(save.error)} />
        <TextField
          label="Nome"
          value={values.name}
          onChange={(event) => set('name')(event.target.value)}
          error={errors.name}
        />
        <TextField
          label="Endereço"
          value={values.slug}
          onChange={(event) => set('slug')(event.target.value)}
          error={errors.slug}
          hint="Opcional. Se ficar vazio, é gerado a partir do nome."
        />
        <Select
          label="Subgênero de"
          value={values.parentId}
          onChange={(event) => set('parentId')(event.target.value)}
          error={errors.parentId}
        >
          <option value="">Nenhum (gênero principal)</option>
          {options
            .filter((option) => !blocked.has(option.id))
            .map((option) => (
              <option key={option.id} value={option.id}>
                {'  '.repeat(option.depth)}
                {option.name}
              </option>
            ))}
        </Select>
        <TextArea
          label="Descrição"
          rows={3}
          value={values.description}
          onChange={(event) => set('description')(event.target.value)}
          error={errors.description}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar gênero'}
          </Button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4"
            >
              Cancelar edição
            </button>
          )}
        </div>
        <p aria-live="polite" className="text-sm text-muted">
          {saved && !save.isPending && !editing ? 'Gênero salvo.' : ''}
        </p>
      </form>
    </div>
  )
}

function findGenre(tree: Parameters<typeof flattenGenres>[0] | undefined, id: string): GenreItem | undefined {
  for (const node of tree ?? []) {
    if (node.id === id) {
      return node
    }
    const found = findGenre(node.children, id)
    if (found) {
      return found
    }
  }
  return undefined
}
