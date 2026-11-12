import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { FieldMessage } from './field-message'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

/** Campo de texto longo, com o mesmo comportamento do TextField. */
export function TextArea({ label, hint, error, className, id, rows = 4, ...props }: TextAreaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'rounded-xs border bg-transparent px-3 py-2.5 font-serif text-lg text-ink placeholder:text-muted',
          error ? 'border-2 border-danger' : 'border-rule-strong hover:border-ink',
        )}
        {...props}
      />
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  )
}
