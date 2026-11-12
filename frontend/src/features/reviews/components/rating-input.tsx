import { useId, useState } from 'react'
import { cn } from '../../../lib/cn'

const LEVELS = 10

interface RatingInputProps {
  /** Nota escolhida, ou null enquanto a pessoa não escolheu. */
  value: number | null
  onChange: (value: number) => void
  error?: string
}

/**
 * Escolha da nota, de 1 a 10, desenhada como o medidor do site. Por baixo são dez botões
 * de rádio de verdade: o teclado (setas, Tab) e os leitores de tela funcionam sem código extra.
 * Passar o mouse mostra a nota que o clique daria.
 */
export function RatingInput({ value, onChange, error }: RatingInputProps) {
  const name = useId()
  const errorId = `${name}-error`
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-semibold">Sua nota</legend>
      <div className="mt-2 flex items-center gap-4" onMouseLeave={() => setHover(null)}>
        <div className="flex">
          {Array.from({ length: LEVELS }, (_, index) => {
            const level = index + 1
            return (
              <label
                key={level}
                className="group relative flex h-11 w-8 cursor-pointer items-center justify-center md:w-9"
                onMouseEnter={() => setHover(level)}
              >
                <input
                  type="radio"
                  name={name}
                  value={level}
                  checked={value === level}
                  onChange={() => onChange(level)}
                  aria-label={`Nota ${level}`}
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2 w-6 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink md:w-7',
                    level <= shown ? 'bg-accent' : 'bg-rule',
                  )}
                />
              </label>
            )
          })}
        </div>
        <p aria-hidden="true" className="min-w-14 font-display text-2xl leading-none">
          {shown > 0 ? `${shown}/${LEVELS}` : ''}
        </p>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
