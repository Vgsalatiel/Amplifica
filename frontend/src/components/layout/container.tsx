import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ContainerProps {
  children: ReactNode
  className?: string
}

/** Largura máxima e margens laterais comuns a todas as páginas. */
export function Container({ children, className }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-7xl px-6 md:px-16', className)}>{children}</div>
}
