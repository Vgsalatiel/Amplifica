import { cn } from '../../../lib/cn'

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

interface YouTubeEmbedProps {
  videoId: string
  title: string
  /** Toca assim que carrega. Sem som (`muted`), os navegadores deixam; com som, só depois de um clique. */
  autoPlay?: boolean
  muted?: boolean
  /** Outros vídeos para tocar em seguida, em ordem. O último volta ao primeiro. */
  playlist?: string[]
  className?: string
}

/**
 * Player incorporado do YouTube, no modo de privacidade reforçada (youtube-nocookie.com),
 * que só grava cookies quando o vídeo toca. A API já valida o id; conferir de novo
 * aqui evita montar um endereço estranho caso um dado ruim chegue ao navegador.
 */
export function YouTubeEmbed({
  videoId,
  title,
  autoPlay = false,
  muted = false,
  playlist,
  className,
}: YouTubeEmbedProps) {
  if (!VIDEO_ID.test(videoId)) {
    return null
  }
  const params = new URLSearchParams()
  if (autoPlay) {
    params.set('autoplay', '1')
  }
  if (muted) {
    params.set('mute', '1')
  }
  const next = (playlist ?? []).filter((id) => VIDEO_ID.test(id) && id !== videoId)
  if (next.length > 0) {
    params.set('playlist', next.join(','))
    params.set('loop', '1')
  }
  if (autoPlay || next.length > 0) {
    params.set('playsinline', '1')
    params.set('rel', '0')
  }
  const query = params.toString()

  return (
    <div className={cn('aspect-video w-full max-w-3xl bg-surface-raised', className)}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}${query ? `?${query}` : ''}`}
        title={`Vídeo de ${title} no YouTube`}
        loading={autoPlay ? 'eager' : 'lazy'}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    </div>
  )
}
