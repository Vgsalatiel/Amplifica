import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SiteHeader } from './site-header'

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/guia']}>
      <SiteHeader />
    </MemoryRouter>,
  )
}

describe('SiteHeader', () => {
  it('abre e fecha o menu de celular', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('navigation')).toHaveLength(1)

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
  })

  it('fecha o menu ao escolher um item', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    const mobileNav = screen.getAllByRole('navigation')[1]
    fireEvent.click(mobileNav.querySelector('a')!)

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
  })

  it('marca a página atual na navegação', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Guia visual' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })
})
