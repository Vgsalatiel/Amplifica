import { useId, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { cn } from '../../lib/cn'

interface HeaderSearchProps {
  className?: string
  onNavigate?: () => void
}

/** Caixa de busca do cabeçalho: leva a /buscar?q=... com artistas e lançamentos que combinam. */
export function HeaderSearch({ className, onNavigate }: HeaderSearchProps) {
  const id = useId()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  // Na própria página de busca, o campo mostra o que está sendo procurado.
  const current = pathname === '/buscar' ? (params.get('q') ?? '') : ''

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    if (!term) {
      return
    }
    onNavigate?.()
    void navigate(`/buscar?q=${encodeURIComponent(term)}`)
  }

  return (
    // A chave refaz o campo quando a busca muda por outro caminho (voltar, link).
    <form key={current} role="search" onSubmit={submit} className={cn('flex', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar artistas e lançamentos
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={current}
        maxLength={80}
        placeholder="Buscar artistas e discos"
        className="h-11 w-full rounded-xs border border-rule-strong bg-transparent px-3 text-[15px] text-ink placeholder:text-muted hover:border-ink"
      />
    </form>
  )
}
