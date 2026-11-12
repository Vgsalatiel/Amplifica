import { cn } from '../../../lib/cn'

interface StepProgressProps {
  current: number
  total: number
}

/** Progresso do cadastro, no mesmo desenho do medidor de nota. */
export function StepProgress({ current, total }: StepProgressProps) {
  return (
    <div className="flex items-center gap-4">
      <div role="img" aria-label={`Passo ${current} de ${total}`} className="flex gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={cn('h-1.5 w-11', index < current ? 'bg-accent' : 'bg-rule')} />
        ))}
      </div>
      <p aria-hidden="true" className="text-[15px] text-muted">
        Passo {current} de {total}
      </p>
    </div>
  )
}
