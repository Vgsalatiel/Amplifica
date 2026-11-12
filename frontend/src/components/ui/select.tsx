import { useId, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { FieldMessage } from './field-message'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
}

/** Lista de opções com rótulo, dica e erro ligados ao campo, no mesmo estilo do TextField. */
export function Select({ label, hint, error, className, id, children, ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const messageId = `${selectId}-message`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'h-12 rounded-xs border bg-transparent px-3 text-ink',
          error ? 'border-2 border-danger' : 'border-rule-strong hover:border-ink',
        )}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
