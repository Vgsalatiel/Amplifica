import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import { PrivacyPage } from './privacy-page'
import { SafetyPage } from './safety-page'
import { TermsPage } from './terms-page'

describe('páginas legais', () => {
  it.each([
    ['Termos de uso', <TermsPage key="t" />],
    ['Política de privacidade', <PrivacyPage key="p" />],
    ['Segurança ao encontrar pessoas', <SafetyPage key="s" />],
  ])('%s: título, data e o aviso de que ainda é rascunho', (title, page) => {
    renderWithProviders(page)

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(/Atualizado em/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/ainda não passou por revisão jurídica/)
    expect(document.title).toBe(`${title} | Amplifica`)
  })

  it('a privacidade diz que o nome na lista de presença é opcional e que a conta pode ser excluída', () => {
    renderWithProviders(<PrivacyPage />)

    expect(screen.getByText(/somente se você marcar/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sua conta' })[0]).toHaveAttribute('href', '/conta')
  })

  it('os termos levam à segurança e à privacidade', () => {
    renderWithProviders(<TermsPage />)

    expect(screen.getByRole('link', { name: 'as dicas de segurança' })).toHaveAttribute('href', '/seguranca')
    expect(screen.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade')
  })
})
