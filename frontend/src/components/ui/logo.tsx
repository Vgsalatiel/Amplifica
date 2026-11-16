import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
}

/**
 * Logotipo do Amplifica: o nome em letra de marcador, com uma estrela rosa. A fonte (Permanent
 * Marker, licença Apache 2.0) pode ser usada em logotipos e redistribuída, o que resolve a
 * pendência da Maskneyes, cuja versão de demonstração proibia esse uso. Nenhum outro lugar do
 * site desenha o nome: para trocar o logotipo, basta alterar este componente.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('inline-block -rotate-2 font-display leading-none whitespace-nowrap', className)}>
      Amplifica
      <span aria-hidden="true" className="ml-1 align-super text-[0.45em] text-accent">
        ★
      </span>
    </span>
  )
}
