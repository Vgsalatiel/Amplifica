import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import { releaseSummary } from '../../../test/fixtures'
import { Discography } from './discography'

describe('Discography', () => {
  it('agrupa por tipo, na ordem álbuns, EPs, ao vivo, coletâneas', () => {
    renderWithProviders(
      <Discography
        releases={[
          releaseSummary({ id: '1', title: 'Disco Ao Vivo', type: 'LIVE' }),
          releaseSummary({ id: '2', title: 'Um EP', type: 'EP' }),
          releaseSummary({ id: '3', title: 'Um Álbum', type: 'ALBUM' }),
          releaseSummary({ id: '4', title: 'Uma Coletânea', type: 'COMPILATION' }),
        ]}
      />,
    )

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent?.replace(/\s*\(\d+\)/, ''))).toEqual([
      'Álbuns',
      'EPs',
      'Ao vivo',
      'Coletâneas e remixes',
    ])
  })

  it('ordena cada grupo do mais recente ao mais antigo e mostra a contagem', () => {
    renderWithProviders(
      <Discography
        releases={[
          releaseSummary({ id: '1', title: 'Antigo', releaseDate: '2006-10-30' }),
          releaseSummary({ id: '2', title: 'Novo', releaseDate: '2019-01-25' }),
          releaseSummary({ id: '3', title: 'Do Meio', releaseDate: '2013' }),
        ]}
      />,
    )

    const group = screen.getByRole('region', { name: /Álbuns/ })
    expect(screen.getByRole('heading', { name: /Álbuns \(3\)/ })).toBeInTheDocument()
    expect(within(group).getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Novo'),
      expect.stringContaining('Do Meio'),
      expect.stringContaining('Antigo'),
    ])
  })

  it('omite grupos vazios e avisa quando não há nenhum lançamento', () => {
    const { unmount } = renderWithProviders(<Discography releases={[releaseSummary()]} />)
    expect(screen.queryByRole('heading', { name: /EPs/ })).not.toBeInTheDocument()
    unmount()

    renderWithProviders(<Discography releases={[]} />)
    expect(screen.getByText(/Nenhum lançamento cadastrado/)).toBeInTheDocument()
  })
})
