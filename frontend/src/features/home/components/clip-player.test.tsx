import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/helpers'
import { ClipPlayer } from './clip-player'

type Options = {
  host: string
  videoId: string
  playerVars: Record<string, string | number>
  events: {
    onReady?: () => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

const state = vi.hoisted(() => ({
  players: [] as Array<{
    options: Options
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
        options: Options
        constructor(_element: HTMLElement, options: Options) {
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

function renderPlayer(props: Partial<React.ComponentProps<typeof ClipPlayer>> = {}) {
  const onIndexChange = vi.fn()
  const view = renderWithProviders(
    <ClipPlayer videoIds={IDS} title="Banda A, Banda B" muted selected={0} onIndexChange={onIndexChange} {...props} />,
  )
  return { ...view, onIndexChange }
}

/** Um pai que troca o clipe escolhido, como faz a playlist. */
function Harness() {
  const [selected, setSelected] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setSelected(1)}>
        trocar
      </button>
      <ClipPlayer videoIds={IDS} title="X" muted selected={selected} onIndexChange={setSelected} />
    </>
  )
}

beforeEach(() => {
  state.players = []
  state.fail = false
})

describe('ClipPlayer', () => {
  it('cria o player no modo de privacidade, tocando o primeiro vídeo sozinho e sem som', async () => {
    renderPlayer()

    await waitFor(() => expect(state.players).toHaveLength(1))
    const { options } = current()
    expect(options.host).toBe('https://www.youtube-nocookie.com')
    expect(options.videoId).toBe(IDS[0])
    expect(options.playerVars).toMatchObject({ autoplay: 1, mute: 1, playsinline: 1, rel: 0 })

    options.events.onReady?.()
    expect(current().iframe).toHaveAttribute('title', 'Vídeo de Banda A, Banda B no YouTube')
  })

  it('com som quando a pessoa já clicou (muted desligado)', async () => {
    renderPlayer({ muted: false })

    await waitFor(() => expect(state.players).toHaveLength(1))
    expect(current().options.playerVars.mute).toBe(0)
  })

  it('começa pelo clipe escolhido (selected)', async () => {
    renderPlayer({ selected: 2 })

    await waitFor(() => expect(state.players).toHaveLength(1))
    expect(current().options.videoId).toBe(IDS[2])
  })

  it('trocar o clipe escolhido toca o novo, sem recriar o player', async () => {
    renderWithProviders(<Harness />)
    await waitFor(() => expect(state.players).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'trocar' }))

    await waitFor(() => expect(current().loadVideoById).toHaveBeenCalledWith(IDS[1]))
    expect(state.players).toHaveLength(1)
  })

  it('quando um clipe termina, toca o próximo e avisa a lista; no fim da lista, volta ao primeiro', async () => {
    const { onIndexChange } = renderPlayer({ selected: 1 })
    await waitFor(() => expect(state.players).toHaveLength(1))

    act(() => current().options.events.onStateChange?.({ data: 0 }))
    act(() => current().options.events.onStateChange?.({ data: 0 }))

    expect(current().loadVideoById.mock.calls.map(([id]) => id)).toEqual([IDS[2], IDS[0]])
    expect(onIndexChange.mock.calls.map(([index]) => index)).toEqual([2, 0])
  })

  it('pula um clipe com erro, mas para se todos falharem em sequência', async () => {
    const { onIndexChange } = renderPlayer({ videoIds: IDS.slice(0, 2) })
    await waitFor(() => expect(state.players).toHaveLength(1))

    act(() => current().options.events.onError?.({ data: 150 }))
    expect(current().loadVideoById).toHaveBeenCalledTimes(1)
    expect(onIndexChange).toHaveBeenCalledWith(1)

    act(() => current().options.events.onError?.({ data: 150 }))
    expect(current().loadVideoById).toHaveBeenCalledTimes(1)
  })

  it('não tem botão próprio: a troca é pela playlist ou pelo fim do clipe', async () => {
    renderPlayer()
    await waitFor(() => expect(state.players).toHaveLength(1))

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('destrói o player ao sair da página', async () => {
    const { unmount } = renderPlayer()
    await waitFor(() => expect(state.players).toHaveLength(1))
    const player = current()

    unmount()

    expect(player.destroy).toHaveBeenCalled()
  })

  it('se o script do YouTube não carrega, mostra um link para abrir o clipe lá', async () => {
    state.fail = true
    renderPlayer()

    const link = await screen.findByRole('link', { name: /Abrir o clipe no YouTube/ })
    expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${IDS[0]}`)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
  it('um clipe novo na lista não recria o player nem recarrega o vídeo que está no ar', async () => {
    function Growing() {
      const [ids, setIds] = useState(IDS)
      return (
        <>
          <button type="button" onClick={() => setIds([IDS[0]!, 'NEWNEWNEW01', ...IDS.slice(1)])}>
            chegou pedido
          </button>
          <ClipPlayer videoIds={ids} title="X" muted selected={0} onIndexChange={() => {}} />
        </>
      )
    }
    renderWithProviders(<Growing />)
    await waitFor(() => expect(state.players).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'chegou pedido' }))

    expect(state.players).toHaveLength(1)
    expect(current().destroy).not.toHaveBeenCalled()
    expect(current().loadVideoById).not.toHaveBeenCalled()

    // Quando o clipe termina, o próximo é o que acabou de entrar.
    act(() => current().options.events.onStateChange?.({ data: 0 }))
    expect(current().loadVideoById).toHaveBeenCalledWith('NEWNEWNEW01')
  })
})
