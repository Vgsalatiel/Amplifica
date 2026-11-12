import type { FieldErrors } from '../../lib/form-errors'
import type { RegisterInput } from './api/auth-api'

/**
 * Checagem rápida do cadastro antes de chamar a API, com as mesmas regras e mensagens
 * do backend. Serve só para poupar uma ida ao servidor: quem decide é sempre a API,
 * e os erros dela (por exemplo, e-mail já em uso) aparecem nos mesmos campos.
 */
export function validateRegister(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = 'Digite um e-mail válido, como nome@exemplo.com.'
  }

  if (input.username.length < 3) {
    errors.username = 'O nome de usuário precisa de pelo menos 3 caracteres.'
  } else if (input.username.length > 20) {
    errors.username = 'O nome de usuário pode ter até 20 caracteres.'
  } else if (!/^[a-z0-9._]+$/.test(input.username)) {
    errors.username = 'Use apenas letras minúsculas, números, ponto e sublinhado.'
  }

  if (input.password.length < 8) {
    errors.password = 'A senha precisa de pelo menos 8 caracteres.'
  }

  return errors
}
