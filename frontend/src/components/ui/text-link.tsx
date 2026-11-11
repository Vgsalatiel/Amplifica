import { Link, type LinkProps } from 'react-router'
import { cn } from '../../lib/cn'

/** Link de texto: sublinhado sempre visível, para não depender só da cor. */
export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        'underline decoration-1 underline-offset-4 transition-colors hover:text-ochre',
        className,
      )}
      {...props}
    />
  )
}
