import { Link, type LinkProps } from 'react-router'
import { buttonClasses, type ButtonVariant } from './button-styles'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

/** Link de navegação com aparência de botão. Para ações, use <Button>. */
export function ButtonLink({ variant = 'primary', className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />
}
