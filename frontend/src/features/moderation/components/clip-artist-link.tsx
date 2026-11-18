import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { TextField } from '../../../components/ui/text-field'
import { listArtists } from '../../catalog/api/catalog-api'

/** Escolha da banda de um clipe: `undefined` mantém o que já existe, `null` tira a ligação. */
export type ArtistChoice = { id: string; name: string } | null | undefined

interface ClipArtistLinkProps {
  /** A banda ligada hoje ao clipe, se houver. */
  current: { slug: string; name: string } | null
  value: ArtistChoice
  onChange: (value: ArtistChoice) => void
}

/**
 * Liga o clipe a uma banda do catálogo: busca pelo nome e escolhe. Com a banda ligada, a playlist
 * mostra o link "Banda" para a página dela. Sem mexer aqui, a ligação atual continua como está.
 */
export function ClipArtistLink({ current, value, onChange }: ClipArtistLinkProps) {
  const [search, setSearch] = useState('')
  const term = search.trim()
  const results = useQuery({
    queryKey: ['artists', 'clip-link', term],
    queryFn: () => listArtists({ q: term, limit: 6 }),
    enabled: term.length >= 2,
  })

  const shown = value === undefined ? (current?.name ?? null) : value === null ? null : value.name
  const note = value === null ? ' (a ligação será removida)' : value ? ' (nova)' : ''

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Banda do catálogo</p>
      <p className="text-sm">
        {shown ?? <span className="text-muted">nenhuma</span>}
        <span className="text-muted">{note}</span>
      </p>
      <TextField
        label="Buscar banda pelo nome"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs [&>label]:sr-only"
        placeholder="Buscar banda pelo nome"
      />
      {term.length >= 2 && results.data && (
        <ul className="max-w-xs divide-y divide-rule border-y border-rule">
          {results.data.items.length === 0 ? (
            <li className="py-2 text-sm text-muted">Nenhuma banda com esse nome.</li>
          ) : (
            results.data.items.map((artist) => (
              <li key={artist.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ id: artist.id, name: artist.name })
                    setSearch('')
                  }}
                  className="min-h-11 w-full cursor-pointer py-2 text-left text-sm font-medium hover:text-accent"
                >
                  Escolher {artist.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {(current || value) && value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-11 w-fit cursor-pointer text-sm font-semibold underline underline-offset-4 hover:text-accent"
        >
          Tirar a ligação com a banda
        </button>
      )}
    </div>
  )
}
