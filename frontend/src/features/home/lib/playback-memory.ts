import type { PlaylistItem } from './playlist'

/**
 * O que está tocando, guardado fora do React para a música seguir quando a pessoa troca de página:
 * a tela que está tocando (o "Agora na tela" da home ou o mini-player) anota aqui a cada segundo, e
 * a próxima tela continua dali. `live` só é verdadeiro com som ligado e o vídeo rodando.
 */
export interface PlaybackMemory {
  items: PlaylistItem[]
  selectedId: string | undefined
  /** Segundo do vídeo atual. */
  time: number
  live: boolean
}

export const playbackMemory: PlaybackMemory = { items: [], selectedId: undefined, time: 0, live: false }

export function resetPlaybackMemory() {
  playbackMemory.items = []
  playbackMemory.selectedId = undefined
  playbackMemory.time = 0
  playbackMemory.live = false
}

/** Estados do player do YouTube em que a música não está tocando: pausado (2) e na fila sem tocar (5). */
export const isPlayingState = (state: number) => state !== 2 && state !== 5
