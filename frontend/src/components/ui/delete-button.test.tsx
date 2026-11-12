import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteButton } from './delete-button'

describe('DeleteButton', () => {
  it('só exclui depois de uma segunda confirmação', () => {
    const onConfirm = vi.fn()
    render(<DeleteButton subject="o artista Vidro Fosco" onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Excluir o artista Vidro Fosco? Não dá para desfazer.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, excluir' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('permite desistir', () => {
    const onConfirm = vi.fn()
    render(<DeleteButton subject="o gênero Emo" onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
