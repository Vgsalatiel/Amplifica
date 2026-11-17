import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { YouTubeEmbed } from './youtube-embed'

describe('YouTubeEmbed', () => {
  it('usa o modo de privacidade reforçada e dá título ao player', () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="Sempiternal" />)

    const frame = screen.getByTitle('Vídeo de Sempiternal no YouTube')
    expect(frame).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(frame).toHaveAttribute('loading', 'lazy')
  })

  it('com autoplay sem som e playlist, monta os parâmetros e ignora ids inválidos', () => {
    render(
      <YouTubeEmbed
        videoId="dQw4w9WgXcQ"
        title="Clipes"
        autoPlay
        muted
        playlist={['3psvNDHQv7Y', 'inválido', 'dQw4w9WgXcQ']}
      />,
    )

    const url = new URL(screen.getByTitle('Vídeo de Clipes no YouTube').getAttribute('src')!)
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('mute')).toBe('1')
    expect(url.searchParams.get('playlist')).toBe('3psvNDHQv7Y')
    expect(url.searchParams.get('loop')).toBe('1')
  })

  it.each(['curto', 'dQw4w9WgXcQ"><script>', '../../x', ''])('não monta o player para o id "%s"', (videoId) => {
    const { container } = render(<YouTubeEmbed videoId={videoId} title="X" />)

    expect(container).toBeEmptyDOMElement()
  })
})
