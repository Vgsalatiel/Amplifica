import { parseYouTubeId } from '../../../lib/youtube'
import type { PlaylistClip } from '../../../types/api'
import type { Clip } from './clips'

/** Um item da playlist, já no formato que a tela usa, venha da API ou da lista reserva. */
export interface PlaylistItem {
  id: string
  /** Código do vídeo no YouTube. */
  videoId: string
  title: string
  /** Banda ou canal, embaixo do título. */
  subtitle: string
  /** A banda no catálogo, quando há. */
  artist: { slug: string; name: string } | null
  /** Quem sugeriu (sugestões aprovadas). */
  suggestedBy: { username: string; displayName: string } | null
}

export function fromApi(clips: PlaylistClip[]): PlaylistItem[] {
  return clips.map((clip) => ({
    id: clip.id,
    videoId: clip.youtubeId,
    title: clip.title,
    subtitle: clip.artist?.name ?? clip.channelName,
    artist: clip.artist,
    suggestedBy: clip.suggestedBy,
  }))
}

/** A lista reserva (`clips.ts`): usada enquanto a playlist da API não responde ou está vazia. Pula quem não tem link. */
export function fromConstants(clips: Clip[]): PlaylistItem[] {
  return clips.flatMap((clip) => {
    const videoId = parseYouTubeId(clip.youtube)
    return videoId
      ? [
          {
            id: clip.id,
            videoId,
            title: clip.title ?? clip.band,
            subtitle: clip.band,
            artist: { slug: clip.artistSlug, name: clip.band },
            suggestedBy: null,
          },
        ]
      : []
  })
}
