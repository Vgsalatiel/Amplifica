import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
}

/**
 * Logotipo do Amplifica.
 *
 * A identidade aprovada usa a fonte Maskneyes aqui, mas a versão baixada é uma demo
 * de uso pessoal cuja licença proíbe uso em logotipos e redistribuição. Enquanto a
 * licença não for adquirida, o logotipo usa a Fraunces. Para trocar, basta alterar
 * este componente: nenhum outro lugar do site desenha o nome.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('font-display leading-none font-extrabold tracking-tight italic', className)}>
      Amplifica
    </span>
  )
}
