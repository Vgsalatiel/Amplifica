import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionHeadingProps {
  children: ReactNode
  as?: 'h2' | 'h3'
  className?: string
}

export function SectionHeading({ children, as: Tag = 'h2', className }: SectionHeadingProps) {
  return (
    <Tag className={cn('font-display text-4xl leading-none font-normal italic', className)}>
      {children}
    </Tag>
  )
}
