import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

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
  const message = error ?? hint

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'h-12 rounded-xs border bg-transparent px-3 text-ink placeholder:text-muted',
          error ? 'border-2 border-danger' : 'border-rule-strong hover:border-ink',
        )}
        {...props}
      />
      {message && (
        <p
          id={messageId}
          className={cn('flex items-start gap-1.5 text-sm', error ? 'font-medium text-danger' : 'text-muted')}
        >
          {/* O ícone garante que o erro não dependa só da cor. */}
          {error && (
            <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
          )}
          {message}
        </p>
      )}
    </div>
  )
}
