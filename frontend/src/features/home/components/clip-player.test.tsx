import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import { ClipPlayer } from './clip-player'

const state = vi.hoisted(() => ({
  players: [] as Array<{
    options: {
      host: string
      videoId: string
      playerVars: Record<string, string | number>
      events: {
        onReady?: () => void
        onStateChange?: (event: { data: number }) => void
        onError?: (event: { data: number }) => void
      }
    }
    loadVideoById: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    iframe: HTMLIFrameElement
  }>,
  fail: false,
}))

vi.mock('../../../lib/youtube-api', () => ({
  loadYouTubeApi: () => {
    if (state.fail) {
      return Promise.reject(new Error('bloqueado'))
    }
    return Promise.resolve({
      PlayerState: { ENDED: 0, PLAYING: 1 },
      Player: class {
        loadVideoById = vi.fn()
        destroy = vi.fn()
        iframe = document.createElement('iframe')
        options: (typeof state.players)[number]['options']
        constructor(_element: HTMLElement, options: (typeof state.players)[number]['options']) {
          this.options = options
          state.players.push(this as unknown as (typeof state.players)[number])
        }
        getIframe() {
          return this.iframe
        }
      },
    })
  },
}))

const IDS = ['dQw4w9WgXcQ', '3psvNDHQv7Y', 'JPUuPU6VuZY']
const current = () => state.players[state.players.length - 1]!

beforeEach(() => {
  state.players = []
  state.fail = false
})

describe('ClipPlayer', () => {
  it('cria o player no modo de privacidade, tocando o primeiro vídeo sozinho e sem som', async () => {
    renderWithProviders(<ClipPlayer videoIds={IDS} title="Banda A, Banda B" muted />)

    await waitFor(() => expect(state.players).toHaveLength(1))
    const { options } = current()
    expect(options.host).toBe('https://www.youtube-nocookie.com')
    expect(options.videoId).toBe(IDS[0])
    expect(options.playerVars).toMatchObject({ autoplay: 1, mute: 1, playsinline: 1, rel: 0 })

    options.events.onReady?.()
    expect(current().iframe).toHaveAttribute('title', 'Vídeo de Banda A, Banda B no YouTube')
  })

  it('com som quando a pessoa já clicou (muted desligado)', async () => {
    renderWithProviders(<ClipPlayer videoIds={IDS} title="X" muted={false} />)

    await waitFor(() => expect(state.players).toHaveLength(1))
    expect(current().options.playerVars.mute).toBe(0)
  })

  it('a seta "Próximo clipe" passa para o seguinte e, no fim da lista, volta ao primeiro', async () => {
    renderWithProviders(<ClipPlayer videoIds={IDS} title="X" muted />)
    await waitFor(() => expect(state.players).toHaveLength(1))
    const button = screen.getByRole('button', { name: 'Próximo clipe' })

    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    expect(current().loadVideoById.mock.calls.map(([id]) => id)).toEqual([IDS[1], IDS[2], IDS[0]])
  })

  it('quando um clipe termina, toca o próximo sozinho', async () => {
    renderWithProviders(<ClipPlayer videoIds={IDS} title="X" muted />)
    await waitFor(() => expect(state.players).toHaveLength(1))

    act(() => current().options.events.onStateChange?.({ data: 0 }))

    expect(current().loadVideoById).toHaveBeenCalledWith(IDS[1])
  })

  it('pula um clipe com erro, mas para se todos falharem em sequência', async () => {
    renderWithProviders(<ClipPlayer videoIds={IDS.slice(0, 2)} title="X" muted />)
    await waitFor(() => expect(state.players).toHaveLength(1))

    act(() => current().options.events.onError?.({ data: 150 }))
    expect(current().loadVideoById).toHaveBeenCalledTimes(1)

    act(() => current().options.events.onError?.({ data: 150 }))
    expect(current().loadVideoById).toHaveBeenCalledTimes(1)
  })

  it('com um vídeo só, não mostra a seta', async () => {
    renderWithProviders(<ClipPlayer videoIds={[IDS[0]!]} title="X" muted />)
    await waitFor(() => expect(state.players).toHaveLength(1))

    expect(screen.queryByRole('button', { name: 'Próximo clipe' })).not.toBeInTheDocument()
  })

  it('destrói o player ao sair da página', async () => {
    const { unmount } = renderWithProviders(<ClipPlayer videoIds={IDS} title="X" muted />)
    await waitFor(() => expect(state.players).toHaveLength(1))
    const player = current()

    unmount()

    expect(player.destroy).toHaveBeenCalled()
  })

  it('se o script do YouTube não carrega, mostra um link para abrir o clipe lá', async () => {
    state.fail = true
    renderWithProviders(<ClipPlayer videoIds={IDS} title="X" muted />)

    const link = await screen.findByRole('link', { name: /Abrir o clipe no YouTube/ })
    expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${IDS[0]}`)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('button', { name: 'Próximo clipe' })).not.toBeInTheDocument()
  })
})
