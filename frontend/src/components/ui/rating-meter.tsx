import { cn } from '../../lib/cn'
import { formatRating } from '../../lib/format-rating'

const LEVELS = 10

interface RatingMeterProps {
  /** Nota de 1 a 10. Aceita decimais, como a média de um lançamento. */
  value: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Nota como medidor de volume: dez níveis, acesos até o valor arredondado.
 * Para leitores de tela é uma única imagem com a nota exata no rótulo.
 */
export function RatingMeter({ value, size = 'md', className }: RatingMeterProps) {
  const clamped = Math.min(LEVELS, Math.max(0, value))
  const lit = Math.round(clamped)

  return (
    <div
      role="img"
      aria-label={`Nota ${formatRating(clamped)} de ${LEVELS}`}
      className={cn('flex', size === 'md' ? 'gap-1.5' : 'gap-1', className)}
    >
      {Array.from({ length: LEVELS }, (_, index) => (
        <span
          key={index}
          data-lit={index < lit}
          className={cn(
            size === 'md' ? 'h-1.5 w-5' : 'h-1 w-3',
            index < lit ? 'bg-ochre' : 'bg-rule',
          )}
        />
      ))}
    </div>
  )
}
