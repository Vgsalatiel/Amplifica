import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { FieldMessage } from './field-message'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

/** Campo de texto com rótulo, dica e mensagem de erro ligados ao input para leitores de tela. */
export function TextField({ label, hint, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'h-12 rounded-xs border bg-transparent px-3 text-ink placeholder:text-muted',
          error ? 'border-2 border-danger' : 'border-rule-strong hover:border-ink',
        )}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
