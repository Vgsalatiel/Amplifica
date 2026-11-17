import { useEffect, useRef, useState } from 'react'
import { loadYouTubeApi, type YTPlayer } from '../../../lib/youtube-api'

interface ClipPlayerProps {
  /** Códigos dos vídeos, na ordem em que tocam. O último volta ao primeiro. */
  videoIds: string[]
  /** Nome para o título acessível do player. */
  title: string
  /** Sem som: é o que os navegadores deixam fazer sozinho. Com som, só depois de um clique. */
  muted: boolean
}

/**
 * Os clipes tocando um depois do outro numa tela só, com a seta "Próximo clipe" embaixo. A ordem é
 * controlada aqui, pela API do player: a lista embutida do YouTube pula ou repete vídeos de forma
 * imprevisível. Um clipe com erro é pulado, e se todos falharem em sequência a tela para.
 */
export function ClipPlayer({ videoIds, title, muted }: ClipPlayerProps) {
  const holder = useRef<HTMLDivElement>(null)
  const advance = useRef<() => void>(() => {})
  // Guarda para qual lista o player falhou: ao trocar de lista, a falha antiga não vale mais.
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const key = videoIds.join(',')
  const failed = failedKey === key

  useEffect(() => {
    const ids = key.split(',')
    let cancelled = false
    let player: YTPlayer | null = null
    let position = 0
    let failures = 0

    const next = () => {
      position = (position + 1) % ids.length
      player?.loadVideoById(ids[position]!)
    }
    advance.current = next

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !holder.current) {
          return
        }
        const target = document.createElement('div')
        holder.current.replaceChildren(target)
        player = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: ids[0]!,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 1, mute: muted ? 1 : 0, playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => player?.getIframe().setAttribute('title', `Vídeo de ${title} no YouTube`),
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                failures = 0
              } else if (event.data === YT.PlayerState.ENDED) {
                next()
              }
            },
            onError: () => {
              failures += 1
              if (failures < ids.length) {
                next()
              }
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) {
          setFailedKey(key)
        }
      })

    return () => {
      cancelled = true
      advance.current = () => {}
      player?.destroy()
    }
  }, [key, muted, title])

  const first = key.split(',')[0]!

  return (
    <div>
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

      {videoIds.length > 1 && !failed && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => advance.current()}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-5 font-extrabold transition-colors hover:border-accent hover:text-accent"
          >
            Próximo clipe
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
