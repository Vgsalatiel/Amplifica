import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import { releaseSummary } from '../../../test/fixtures'
import { CoverMural, MURAL_SIZE } from './cover-mural'

const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    releaseSummary({ id: `r${index}`, title: `Disco ${index}`, slug: `disco-${index}` }),
  )

describe('CoverMural', () => {
  it('mostra no máximo o tamanho do mural, em ordem', () => {
    renderWithProviders(<CoverMural releases={many(MURAL_SIZE + 5)} />)

    const links = within(screen.getByRole('list', { name: 'Discos em destaque' })).getAllByRole('link')
    expect(links).toHaveLength(MURAL_SIZE)
    expect(links[0]).toHaveAccessibleName('Disco 0, Bring Me the Horizon')
  })

  it('pula discos sem capa', () => {
    renderWithProviders(
      <CoverMural releases={[releaseSummary({ id: 'a', title: 'Sem capa', cover: null }), ...many(2)]} />,
    )

    expect(screen.queryByRole('link', { name: /Sem capa/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('não mostra nada quando nenhum disco tem capa', () => {
    const { container } = renderWithProviders(<CoverMural releases={[releaseSummary({ cover: null })]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('usa a cor do disco (clareada) no bloco atrás da capa, e a cor padrão se a cor for inválida', () => {
    renderWithProviders(
      <CoverMural
        releases={[
          releaseSummary({ id: 'a', title: 'Com cor', accentColor: '#0F766E' }),
          releaseSummary({ id: 'b', title: 'Cor ruim', accentColor: 'red; background: url(x)' }),
        ]}
      />,
    )

    const image = (name: string) => screen.getByRole('link', { name }).querySelector('img')
    // A cor do disco é clareada (fundo preto): o bloco usa `color-mix` com a cor original.
    expect(image('Com cor, Bring Me the Horizon')!.getAttribute('style')).toMatch(/color-mix\(.*rgb\(15, 118, 110\)/)
    expect(image('Cor ruim, Bring Me the Horizon')!.getAttribute('style')).toContain('var(--color-accent)')
  })

  it('cada capa leva à página do disco, e a imagem é decorativa (o link já tem nome)', () => {
    renderWithProviders(<CoverMural releases={many(1)} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/lancamentos/disco-0')
    expect(link.querySelector('img')).toHaveAttribute('alt', '')
  })
})
