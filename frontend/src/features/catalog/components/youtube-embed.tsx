const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Player incorporado do YouTube, no modo de privacidade reforçada (youtube-nocookie.com),
 * que só grava cookies quando a pessoa aperta o play. A API já valida o id; conferir de novo
 * aqui evita montar um endereço estranho caso um dado ruim chegue ao navegador.
 */
export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  if (!VIDEO_ID.test(videoId)) {
    return null
  }
  return (
    <div className="aspect-video w-full max-w-3xl bg-surface-raised">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={`Vídeo de ${title} no YouTube`}
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    </div>
  )
}
