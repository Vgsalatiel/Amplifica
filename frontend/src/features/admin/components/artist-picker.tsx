import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Select } from '../../../components/ui/select'
import { TextField } from '../../../components/ui/text-field'
import { listArtists } from '../../catalog/api/catalog-api'
import type { ReleaseArtistValues } from '../lib/forms'

interface ArtistPickerProps {
  value: ReleaseArtistValues[]
  onChange: (artists: ReleaseArtistValues[]) => void
  error?: string
}

/**
 * Escolha dos artistas de um lançamento: a pessoa busca pelo nome, adiciona, e define
 * quem é o principal e quem é participação. A ordem em que são adicionados é a ordem
 * em que aparecem no lançamento.
 */
export function ArtistPicker({ value, onChange, error }: ArtistPickerProps) {
  const [search, setSearch] = useState('')
  const term = search.trim()

  const results = useQuery({
    queryKey: ['artists', 'picker', term],
    queryFn: () => listArtists({ q: term, limit: 8 }),
    enabled: term.length >= 2,
  })

  const chosen = new Set(value.map((artist) => artist.artistId))
  const available = results.data?.items.filter((artist) => !chosen.has(artist.id)) ?? []

  function add(artist: { id: string; name: string }) {
    // O primeiro artista é o principal; os seguintes entram como participação.
    onChange([
      ...value,
      { artistId: artist.id, name: artist.name, role: value.length === 0 ? 'PRIMARY' : 'FEATURED' },
    ])
    setSearch('')
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold">Artistas</legend>

      {value.length > 0 && (
        <ul className="divide-y divide-rule border-y border-rule">
          {value.map((artist, index) => (
            <li key={artist.artistId} className="flex flex-wrap items-center gap-4 py-3">
              <span className="min-w-0 flex-1 font-medium">{artist.name}</span>
              <Select
                label={`Papel de ${artist.name}`}
                value={artist.role}
                onChange={(event) =>
                  onChange(
                    value.map((item, position) =>
                      position === index ? { ...item, role: event.target.value as typeof item.role } : item,
                    ),
                  )
                }
                className="[&>label]:sr-only"
              >
                <option value="PRIMARY">Principal</option>
                <option value="FEATURED">Participação</option>
              </Select>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
                className="min-h-11 cursor-pointer text-sm font-semibold underline underline-offset-4 hover:text-accent"
              >
                Remover {artist.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <TextField
        label="Buscar artista para adicionar"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Digite ao menos duas letras"
        error={error}
        hint={value.length === 0 ? 'O primeiro artista adicionado é o principal.' : undefined}
      />

      {term.length >= 2 && (
        <div aria-live="polite">
          {results.isPending ? (
            <p className="text-sm text-muted">Buscando…</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum artista encontrado. Cadastre o artista primeiro, em Artistas.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {available.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    onClick={() => add(artist)}
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
    </fieldset>
  )
}
