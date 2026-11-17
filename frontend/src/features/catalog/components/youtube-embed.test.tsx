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

  it.each(['curto', 'dQw4w9WgXcQ"><script>', '../../x', ''])('não monta o player para o id "%s"', (videoId) => {
    const { container } = render(<YouTubeEmbed videoId={videoId} title="X" />)

    expect(container).toBeEmptyDOMElement()
  })
})
