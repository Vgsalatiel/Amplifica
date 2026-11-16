import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ink'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border-2 border-ink text-ink hover:border-accent hover:text-accent',
  // Para quando o botão divide a tela com uma área grande na cor de destaque.
  ink: 'bg-ink text-surface hover:bg-accent',
}

/** Aparência de botão, compartilhada entre <Button> e <ButtonLink>. */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(
    'inline-flex h-12 cursor-pointer items-center justify-center rounded-full px-7 font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  )
}
