import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { endSession, sessionStore, startSession } from '../../lib/session'
import { mockApi, renderWithProviders, sessionFor, testUser } from '../../test/helpers'
import { SiteHeader } from './site-header'

function renderHeader() {
  return renderWithProviders(<SiteHeader />, '/shows')
}

describe('SiteHeader', () => {
  it('abre e fecha o menu de celular', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('navigation')).toHaveLength(1)

    fireEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
  })

  it('fecha o menu ao escolher um item', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))

    const mobileNav = screen.getAllByRole('navigation')[1]
    fireEvent.click(mobileNav.querySelector('a')!)

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
  })

  it('leva às páginas públicas do catálogo, sem exigir conta', () => {
    endSession()
    renderHeader()

    expect(screen.getByRole('link', { name: 'Artistas' })).toHaveAttribute('href', '/artistas')
    expect(screen.getByRole('link', { name: 'Gêneros' })).toHaveAttribute('href', '/generos')
    expect(screen.getByRole('link', { name: 'Shows' })).toHaveAttribute('href', '/shows')
  })

  it('não mostra o guia visual no menu', () => {
    renderHeader()

    expect(screen.queryByRole('link', { name: 'Guia visual' })).not.toBeInTheDocument()
  })

  it('marca a página atual na navegação', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Shows' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('não mostra links de conta enquanto a sessão é verificada', () => {
    renderHeader()

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('oferece entrar e criar conta ao visitante', () => {
    endSession()
    renderHeader()

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('mostra o link da administração só para administradores', () => {
    startSession(sessionFor())
    const { unmount } = renderHeader()
    expect(screen.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument()
    unmount()

    endSession()
    startSession(sessionFor({ ...testUser, role: 'ADMIN' }))
    renderHeader()
    expect(screen.getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin')
  })

  it('mostra o link da moderação para moderadores e administradores, e o da administração só para administradores', () => {
    startSession(sessionFor())
    const { unmount: unmountUser } = renderHeader()
    expect(screen.queryByRole('link', { name: 'Moderação' })).not.toBeInTheDocument()
    unmountUser()

    endSession()
    startSession(sessionFor({ ...testUser, role: 'MODERATOR' }))
    const { unmount: unmountModerator } = renderHeader()
    expect(screen.getByRole('link', { name: 'Moderação' })).toHaveAttribute('href', '/moderacao')
    expect(screen.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument()
    unmountModerator()

    endSession()
    startSession(sessionFor({ ...testUser, role: 'ADMIN' }))
    renderHeader()
    expect(screen.getByRole('link', { name: 'Moderação' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Administração' })).toBeInTheDocument()
  })

  it('mostra o perfil de quem está logado e encerra a sessão ao sair', async () => {
    startSession(sessionFor())
    const fetchMock = mockApi({ 'POST /auth/logout': { status: 204 } })
    renderHeader()

    expect(screen.getByRole('link', { name: 'Marina F.' })).toHaveAttribute('href', '/u/marina.fz')

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sessionStore.getState()).toEqual({ status: 'anonymous' })
  })
  it('o cabeçalho fica fixo no topo, descendo junto com a tela', () => {
    renderWithProviders(<SiteHeader />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0')
  })
})
