import { cn } from '../../lib/cn'
import type { ImageSet } from '../../types/api'

interface CoverProps {
  title: string
  image: ImageSet | null
  /** `large` para a página do disco; `small` (padrão) para listas e cartões. */
  size?: 'small' | 'large'
  className?: string
}

/**
 * Capa quadrada. Sem imagem, mostra o título em um quadro neutro: discos sem capa
 * continuam parecendo parte do catálogo, em vez de um buraco.
 */
export function Cover({ title, image, size = 'small', className }: CoverProps) {
  if (!image) {
    return (
      <div
        role="img"
        aria-label={`${title} (sem capa)`}
        className={cn(
          'flex aspect-square items-center justify-center bg-surface-raised p-4 text-center font-display text-lg leading-tight italic text-muted',
          className,
        )}
      >
        <span aria-hidden="true" className="line-clamp-4">
          {title}
        </span>
      </div>
    )
  }
  return (
    <img
      src={size === 'large' ? image.large : image.small}
      alt={`Capa de ${title}`}
      loading={size === 'large' ? 'eager' : 'lazy'}
      className={cn('aspect-square w-full bg-surface-raised object-cover', className)}
    />
  )
}
