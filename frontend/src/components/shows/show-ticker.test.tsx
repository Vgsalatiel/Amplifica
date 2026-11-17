import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { show } from '../../test/fixtures'
import { renderWithProviders } from '../../test/helpers'
import { ShowTicker } from './show-ticker'

const shows = [show({ id: '1', name: 'CENABR Festival 2027', date: '2027-01-30' }), show({ id: '2' })]

describe('ShowTicker', () => {
  it('parada, mostra os eventos e fica escondida de leitores de tela', () => {
    const { container } = renderWithProviders(<ShowTicker shows={shows} label="Na agenda" />)

    const ticker = container.firstElementChild!
    expect(ticker).toHaveAttribute('aria-hidden', 'true')
    expect(ticker).toHaveTextContent('Na agenda')
    expect(ticker).toHaveTextContent('CENABR Festival 2027, 30 de janeiro')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('correndo, vira um link único para a página e tem botão de pausa', () => {
    renderWithProviders(<ShowTicker shows={shows} label="Emo Tour" animated to="/emo-tour" />)

    expect(screen.getByRole('link', { name: 'Emo Tour: 2 eventos. Ver todos' })).toHaveAttribute('href', '/emo-tour')
    const track = document.querySelector('.animate-marquee') as HTMLElement
    expect(track.style.animationPlayState).toBe('running')

    const button = screen.getByRole('button', { name: 'Pausar faixa' })
    fireEvent.click(button)
    expect(track.style.animationPlayState).toBe('paused')
    expect(screen.getByRole('button', { name: 'Continuar faixa' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sem shows, não mostra nada', () => {
    const { container } = renderWithProviders(<ShowTicker shows={[]} label="Emo Tour" animated />)
    expect(container).toBeEmptyDOMElement()
  })
})
