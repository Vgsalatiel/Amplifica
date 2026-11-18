import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/helpers'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('tem os links dos termos, da privacidade e da segurança', () => {
    renderWithProviders(<SiteFooter />)

    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos')
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(screen.getByRole('link', { name: 'Segurança' })).toHaveAttribute('href', '/seguranca')
  })
})
