import type { ButtonHTMLAttributes } from 'react'
import { buttonClasses, type ButtonVariant } from './button-styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />
}
