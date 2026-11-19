import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PhotoCredit } from './photo-credit'

const credit = {
  author: 'Diogo Rodrigues Gonçalves',
  license: 'CC BY 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Forfun.jpg',
}

describe('PhotoCredit', () => {
  it('mostra o autor e os links da licença e do original, em outra aba e sem referrer', () => {
    render(<PhotoCredit credit={credit} />)

    expect(screen.getByText(/Foto: Diogo Rodrigues Gonçalves/)).toBeInTheDocument()
    const license = screen.getByRole('link', { name: /CC BY 2.0/ })
    expect(license).toHaveAttribute('href', credit.licenseUrl)
    expect(license).toHaveAttribute('target', '_blank')
    expect(license).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: /via Wikimedia Commons/ })).toHaveAttribute('href', credit.sourceUrl)
  })

  it('um link que não é https vira texto, sem link', () => {
    render(<PhotoCredit credit={{ ...credit, licenseUrl: 'javascript:alert(1)', sourceUrl: 'http://exemplo.com' }} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/CC BY 2.0/)).toBeInTheDocument()
  })
})
