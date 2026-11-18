import { useEffect, useRef, useState } from 'react'
import { loadYouTubeApi, type YTPlayer } from '../../../lib/youtube-api'

interface ClipPlayerProps {
  /** Códigos dos vídeos, na ordem em que tocam. O último volta ao primeiro. */
  videoIds: string[]
  /** Nome para o título acessível do player. */
  title: string
  /** Sem som: é o que os navegadores deixam fazer sozinho. Com som, só depois de um clique. */
  muted: boolean
  /** Posição do clipe que deve estar tocando. Mudar este valor troca o clipe na hora. */
  selected: number
  /** Chamado quando o próprio player muda de clipe (terminou ou deu erro), para a lista acompanhar. */
  onIndexChange: (index: number) => void
}

/**
 * Os clipes tocando um depois do outro numa tela só. A ordem é controlada aqui, pela API do
 * player: a lista embutida do YouTube pula ou repete vídeos de forma imprevisível. Um clipe com
 * erro é pulado, e se todos falharem em sequência a tela para. A playlist visível (fora daqui)
 * escolhe o clipe pelo `selected` e acompanha as trocas pelo `onIndexChange`.
 */
export function ClipPlayer({ videoIds, title, muted, selected, onIndexChange }: ClipPlayerProps) {
  const holder = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  // A lista pode ganhar clipes enquanto toca (um pedido novo vira o próximo): o player lê a lista
  // atual por aqui e não é recriado, para o vídeo que está no ar não recomeçar.
  const idsNow = useRef(videoIds)
  const position = useRef(selected)
  const playing = useRef<string | undefined>(videoIds[selected])
  const selectedNow = useRef(selected)
  const notify = useRef(onIndexChange)
  const titleNow = useRef(title)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    idsNow.current = videoIds
    selectedNow.current = selected
    notify.current = onIndexChange
    titleNow.current = title
    player.current?.getIframe().setAttribute('title', `Vídeo de ${title} no YouTube`)
  })

  useEffect(() => {
    let cancelled = false
    let failures = 0
    const first = idsNow.current[Math.min(selectedNow.current, idsNow.current.length - 1)]!
    position.current = Math.min(selectedNow.current, idsNow.current.length - 1)
    playing.current = first

    const play = (index: number) => {
      position.current = index
      playing.current = idsNow.current[index]
      notify.current(index)
      player.current?.loadVideoById(idsNow.current[index]!)
    }
    const next = () => play((position.current + 1) % idsNow.current.length)

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !holder.current) {
          return
        }
        const target = document.createElement('div')
        holder.current.replaceChildren(target)
        const created = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: first,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 1, mute: muted ? 1 : 0, playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => created.getIframe().setAttribute('title', `Vídeo de ${titleNow.current} no YouTube`),
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                failures = 0
              } else if (event.data === YT.PlayerState.ENDED) {
                next()
              }
            },
            onError: () => {
              failures += 1
              if (failures < idsNow.current.length) {
                next()
              }
            },
          },
        })
        player.current = created
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
      player.current?.destroy()
      player.current = null
    }
  }, [muted])

  // A lista mudou ou a pessoa escolheu outro clipe. Se o vídeo no ar continua o mesmo (só mudou
  // a posição dele na lista), apenas acompanha; se é outro, toca esse.
  useEffect(() => {
    const wanted = videoIds[selected]
    if (!wanted) {
      return
    }
    if (wanted === playing.current) {
      position.current = selected
    } else if (player.current) {
      position.current = selected
      playing.current = wanted
      player.current.loadVideoById(wanted)
    }
  }, [selected, videoIds])

  const first = videoIds[0]!

  return (
    <div className="aspect-video w-full border border-rule bg-surface-raised">
      {failed ? (
        <div className="flex size-full items-center justify-center p-6 text-center">
          <p>
            Não foi possível carregar o player.{' '}
            <a
              href={`https://www.youtube.com/watch?v=${first}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-4 hover:text-accent"
            >
              Abrir o clipe no YouTube
              <span className="sr-only"> (abre em outra aba)</span>
            </a>
          </p>
        </div>
      ) : (
        <div ref={holder} className="size-full [&>iframe]:size-full" />
      )}
    </div>
  )
}
