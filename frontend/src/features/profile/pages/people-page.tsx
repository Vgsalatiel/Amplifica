import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/text-field'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import { searchProfiles } from '../api/profile-api'

/** Busca de pessoas, em /pessoas: leva ao perfil, onde dá para ver o gosto em comum. */
export function PeoplePage() {
  useDocumentTitle('Pessoas')
  const [params, setParams] = useSearchParams()
  const term = (params.get('q') ?? '').trim()
  const [draft, setDraft] = useState(term)
  const tooShort = term.length > 0 && term.length < 2

  const results = useQuery({
    queryKey: ['people', term],
    queryFn: () => searchProfiles(term),
    enabled: term.length >= 2,
    retry: shouldRetry,
    retryDelay,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    setParams(next ? { q: next } : {})
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-7xl">Pessoas</h1>
      <p className="mt-4 max-w-xl text-xl">
        Procure alguém pelo nome ou pelo @usuario. No perfil dela, veja quanto o gosto de vocês combina e quais bandas
        vocês dois curtem.
      </p>

      <form role="search" onSubmit={handleSubmit} noValidate className="mt-8 flex max-w-xl flex-wrap items-start gap-3">
        <TextField
          label="Nome ou @usuario"
          name="q"
          type="search"
          maxLength={40}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={tooShort ? 'Digite pelo menos 2 letras.' : undefined}
          className="min-w-60 flex-1"
        />
        <Button type="submit" className="mt-7">
          Buscar
        </Button>
      </form>

      <div className="mt-8" aria-live="polite">
        {term.length < 2 ? null : results.isPending ? (
          <p role="status" className="text-muted">
            Buscando…
          </p>
        ) : results.isError ? (
          <p role="alert" className="font-medium text-danger">
            Não foi possível buscar agora. Tente de novo em instantes.
          </p>
        ) : results.data.length === 0 ? (
          <p className="text-muted">Ninguém encontrado para “{term}”.</p>
        ) : (
          <ul className="max-w-xl divide-y divide-rule border-y border-rule">
            {results.data.map((person) => (
              <li key={person.username}>
                <Link
                  to={`/u/${person.username}`}
                  className="flex min-h-16 items-center gap-4 py-3 hover:text-accent"
                >
                  {person.avatar ? (
                    <img src={person.avatar.small} alt="" className="size-12 shrink-0 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="size-12 shrink-0 bg-surface-raised" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-bold">{person.displayName}</span>
                    <span className="block text-sm text-muted">@{person.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  )
}
