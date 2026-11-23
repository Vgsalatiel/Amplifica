/** Só o que usamos da API de player do YouTube (https://developers.google.com/youtube/iframe_api_reference). */
export interface YTPlayer {
  loadVideoById(videoId: string): void
  playVideo(): void
  pauseVideo(): void
  getCurrentTime(): number
  getPlayerState(): number
  isMuted(): boolean
  destroy(): void
  getIframe(): HTMLIFrameElement
}

export interface YTPlayerOptions {
  host: string
  videoId: string
  width: string
  height: string
  playerVars: Record<string, string | number>
  events: {
    onReady?: () => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

export interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let loading: Promise<YTNamespace> | null = null

/**
 * Carrega a API de player do YouTube uma única vez, sob demanda. O script vem de youtube.com; o
 * vídeo em si continua no modo de privacidade reforçada (youtube-nocookie.com), escolhido no `host`.
 * Se o script não carregar (bloqueador de anúncios, sem rede), a promessa falha e quem chamou mostra um link.
 */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }
  loading ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT as YTNamespace)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      loading = null
      reject(new Error('Não foi possível carregar o player do YouTube.'))
    }
    document.head.appendChild(script)
  })
  return loading
}
