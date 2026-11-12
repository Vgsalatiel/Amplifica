import { describe, expect, it } from 'vitest'
import { validateRegister } from './validation'

const valid = { email: 'marina@exemplo.com', username: 'marina.fz', password: 'senha-segura' }

describe('validateRegister', () => {
  it('não aponta erros em dados válidos', () => {
    expect(validateRegister(valid)).toEqual({})
  })

  it('aponta cada campo inválido', () => {
    const errors = validateRegister({ email: 'sem-arroba', username: 'Nome Errado', password: '123' })

    expect(Object.keys(errors).sort()).toEqual(['email', 'password', 'username'])
  })

  it.each(['ab', 'a'.repeat(21), 'joão', 'com espaço'])('recusa o nome de usuário "%s"', (username) => {
    expect(validateRegister({ ...valid, username }).username).toBeDefined()
  })
})
