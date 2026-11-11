import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextField } from './text-field'

describe('TextField', () => {
  it('liga o rótulo e a dica ao campo', () => {
    render(<TextField label="Nome de usuário" hint="Aparece nas resenhas." />)

    const input = screen.getByLabelText('Nome de usuário')
    expect(input).toHaveAccessibleDescription('Aparece nas resenhas.')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('marca o campo como inválido e descreve o erro', () => {
    render(<TextField label="E-mail" hint="Não será exibido." error="Digite um e-mail completo." />)

    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Digite um e-mail completo.')
  })
})
