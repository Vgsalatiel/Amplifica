import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
}

/**
 * Logotipo do Amplifica: o nome em Archivo Black (licença OFL, que permite uso em logotipo)
 * sobre um bloco amarelo inclinado. Nenhum outro lugar do site desenha o nome: para trocar o
 * logotipo, basta alterar este componente.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-block -skew-x-6 bg-accent px-4 py-1.5 font-display leading-none whitespace-nowrap text-on-accent',
        className,
      )}
    >
      <span className="inline-block skew-x-6">AMPLIFICA</span>
    </span>
  )
}
