import { cn } from '../../lib/cn'

interface FieldMessageProps {
  id: string
  hint?: string
  error?: string
}

/** Dica ou erro abaixo de um campo. O erro leva ícone para não depender só da cor. */
export function FieldMessage({ id, hint, error }: FieldMessageProps) {
  const message = error ?? hint
  if (!message) {
    return null
  }

  return (
    <p id={id} className={cn('flex items-start gap-1.5 text-sm', error ? 'font-medium text-danger' : 'text-muted')}>
      {error && (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
        </svg>
      )}
      {message}
    </p>
  )
}
