import { TextLink } from '../../../components/ui/text-link'
import { useGenreTree } from '../../catalog/hooks/use-catalog'
import { flattenGenres } from '../../catalog/lib/genre-options'

interface GenreChecklistProps {
  value: string[]
  onChange: (ids: string[]) => void
  error?: string
}

/** Escolha de gêneros em lista com recuo por subgênero. */
export function GenreChecklist({ value, onChange, error }: GenreChecklistProps) {
  const genres = useGenreTree()
  const options = genres.data ? flattenGenres(genres.data) : []

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-sm font-semibold">Gêneros</legend>
      {genres.isPending ? (
        <p className="text-sm text-muted">Carregando gêneros…</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhum gênero cadastrado. <TextLink to="/admin/generos">Cadastre gêneros primeiro</TextLink>.
        </p>
      ) : (
        options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-9 cursor-pointer items-center gap-3"
            style={{ paddingLeft: `${option.depth * 1.5}rem` }}
          >
            <input
              type="checkbox"
              className="size-5 accent-accent"
              checked={value.includes(option.id)}
              onChange={(event) =>
                onChange(event.target.checked ? [...value, option.id] : value.filter((id) => id !== option.id))
              }
            />
            {option.name}
          </label>
        ))
      )}
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  )
}
