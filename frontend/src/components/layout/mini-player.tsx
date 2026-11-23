import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ClipPlayer } from '../../features/home/components/clip-player'
import { isPlayingState, playbackMemory } from '../../features/home/lib/playback-memory'
import type { PlaylistItem } from '../../features/home/lib/playlist'
import type { YTPlayer } from '../../lib/youtube-api'

interface Session {
  items: PlaylistItem[]
  selected: number
  startAt: number
}

const buttonClass =
  'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule-strong transition-colors hover:border-accent hover:text-accent'

/**
 * A música que seguiu tocando depois que a pessoa saiu da página inicial. Aparece em qualquer outra
 * página, no canto da tela, só se o "Agora na tela" estava tocando com som. Na home ele some, e o
 * player grande continua do mesmo ponto (veja `playbackMemory`).
 */
export function MiniPlayer({ onHome }: { onHome: boolean }) {
  const [session, setSession] = useState<Session | null>(null)
  const [paused, setPaused] = useState(false)
  const control = useRef<YTPlayer | null>(null)
  const sessionNow = useRef(session)

  useEffect(() => {
    sessionNow.current = session
  })

  // Ao sair da home com a música tocando, o mini-player assume dali; ao voltar, ele some.
  const [wasOnHome, setWasOnHome] = useState(onHome)
  if (wasOnHome !== onHome) {
    setWasOnHome(onHome)
    if (onHome || session || !playbackMemory.live || playbackMemory.items.length === 0) {
      setSession(onHome ? null : session)
    } else {
      const selected = Math.max(
        0,
        playbackMemory.items.findIndex((item) => item.id === playbackMemory.selectedId),
      )
      setPaused(false)
      setSession({ items: playbackMemory.items, selected, startAt: playbackMemory.time })
    }
  }

  if (!session || onHome) {
    return null
  }
  const { items } = session
  const current = items[session.selected] ?? items[0]!

  function go(index: number) {
    const count = items.length
    setSession((previous) => (previous ? { ...previous, selected: (index + count) % count, startAt: 0 } : previous))
    playbackMemory.time = 0
    setPaused(false)
  }

  function toggle() {
    if (paused) {
      control.current?.playVideo()
    } else {
      control.current?.pauseVideo()
    }
    setPaused(!paused)
  }

  /** Abre o clipe no YouTube (no celular, no app) do ponto em que está, e pausa aqui para não tocar em dobro. */
  function openOnYouTube() {
    const seconds = Math.floor(playbackMemory.time)
    const url = `https://www.youtube.com/watch?v=${current.videoId}${seconds > 0 ? `&t=${seconds}s` : ''}`
    control.current?.pauseVideo()
    setPaused(true)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function close() {
    playbackMemory.live = false
    setSession(null)
  }

  return (
    <section
      aria-label="Mini-player"
      className="fixed right-2 bottom-2 z-40 w-64 max-w-[calc(100vw-1rem)] border border-rule-strong bg-surface shadow-lg md:right-4 md:bottom-4"
    >
      <ClipPlayer
        videoIds={items.map((item) => item.videoId)}
        title={items.map((item) => item.subtitle).join(', ')}
        muted={false}
        selected={session.selected}
        startAt={session.startAt}
        controlRef={control}
        onIndexChange={(index) => {
          setSession((previous) => (previous ? { ...previous, selected: index } : previous))
          playbackMemory.time = 0
        }}
        onTick={({ time, state }) => {
          const now = sessionNow.current
          if (!now) {
            return
          }
          playbackMemory.items = now.items
          playbackMemory.selectedId = now.items[now.selected]?.id
          playbackMemory.time = time
          playbackMemory.live = isPlayingState(state)
          setPaused(state === 2)
        }}
      />
      <div className="flex items-center gap-1 p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{current.title}</p>
          {current.artist ? (
            <Link to={`/artistas/${current.artist.slug}`} className="truncate text-xs text-muted underline-offset-4 hover:text-accent hover:underline">
              {current.artist.name}
            </Link>
          ) : (
            <p className="truncate text-xs text-muted">{current.subtitle}</p>
          )}
        </div>
        <button type="button" aria-label="Clipe anterior" onClick={() => go(session.selected - 1)} className={buttonClass}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        <button type="button" aria-label={paused ? 'Tocar' : 'Pausar'} onClick={toggle} className={buttonClass}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d={paused ? 'M8 5v14l11-7z' : 'M6 5h4v14H6zm8 0h4v14h-4z'} />
          </svg>
        </button>
        <button type="button" aria-label="Próximo clipe" onClick={() => go(session.selected + 1)} className={buttonClass}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6zM16 6h2v12h-2z" />
          </svg>
        </button>
        <button type="button" aria-label="Abrir no YouTube (abre em outra aba)" title="Abrir no YouTube" onClick={openOnYouTube} className={buttonClass}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </button>
        <button type="button" aria-label="Fechar o mini-player" onClick={close} className={buttonClass}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </section>
  )
}
