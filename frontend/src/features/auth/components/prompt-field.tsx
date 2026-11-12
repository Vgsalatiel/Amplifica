import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { FieldMessage } from '../../../components/ui/field-message'
import { cn } from '../../../lib/cn'

interface PromptFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** A pergunta do passo. É o título da página e, ao mesmo tempo, o rótulo do campo. */
  question: string
  description: string
  /** Texto fixo antes do valor, como o "@" do nome de usuário. */
  prefix?: string
  hint?: string
  error?: string
  /** Controle extra ao lado do campo, como "mostrar senha". */
  trailing?: ReactNode
}

/**
 * Campo de um passo do cadastro: uma pergunta grande e um único campo para responder.
 * Recebe o foco assim que aparece, para a pessoa seguir digitando sem usar o mouse.
 */
export function PromptField({
  question,
  description,
  prefix,
  hint,
  error,
  trailing,
  className,
  ...props
}: PromptFieldProps) {
  const inputId = useId()
  const messageId = `${inputId}-message`
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className={className}>
      <h1 className="font-display text-5xl leading-[0.98] font-normal tracking-tight text-balance md:text-7xl">
        <label htmlFor={inputId}>{question}</label>
      </h1>
      <p className="mt-5 max-w-xl font-serif text-xl text-muted">{description}</p>

      <div
        className={cn(
          'mt-9 flex max-w-xl items-baseline gap-1.5 border-b-2 pb-2 focus-within:border-accent',
          error ? 'border-danger' : 'border-ink',
        )}
      >
        {prefix && (
          <span aria-hidden="true" className="font-display text-3xl leading-none text-muted md:text-4xl">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          // O contorno de foco fica na linha de baixo do conjunto, não no input.
          className="h-13 min-w-0 flex-1 bg-transparent font-display text-3xl text-ink outline-none md:text-4xl"
          {...props}
        />
        {trailing}
      </div>
      <div className="mt-3">
        <FieldMessage id={messageId} hint={hint} error={error} />
      </div>
    </div>
  )
}
