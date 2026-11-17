import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import { parseYouTubeId } from '../../../lib/youtube'
import { YouTubeEmbed } from '../../catalog/components/youtube-embed'
import { useArtist } from '../../catalog/hooks/use-catalog'
import { NARRATION, type Clip } from '../lib/clips'

const scanlines =
  'bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.035)_0,rgb(255_255_255/0.035)_2px,transparent_2px,transparent_6px)]'

/** Quem pediu menos movimento no aparelho não recebe vídeo que começa sozinho. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * "Agora na tela": os clipes da cena passando um depois do outro, numa tela só. O vídeo começa
 * sozinho e sem som (é o que os navegadores permitem); o som se liga no botão do próprio player.
 * Com a preferência de menos movimento, a tela espera o clique no play, e esse clique já toca com som.
 */
export function NowPlaying({ clips }: { clips: Clip[] }) {
  const [reduced] = useState(prefersReducedMotion)
  const [clicked, setClicked] = useState(false)

  if (clips.length === 0) {
    return null
  }
  const playable = clips.flatMap((clip) => {
    const id = parseYouTubeId(clip.youtube)
    return id ? [{ clip, id }] : []
  })
  const first = playable[0]
  const bands = clips.map((clip) => clip.band).join(', ')

  return (
    <section aria-labelledby="agora-titulo">
      <h2 id="agora-titulo" className="font-display text-3xl leading-none text-accent">
        Agora na tela
      </h2>
      <p className="mt-2 mb-4 font-semibold">{NARRATION}</p>

      {first && (!reduced || clicked) ? (
        <YouTubeEmbed
          videoId={first.id}
          title={playable.map((item) => item.clip.band).join(', ')}
          playlist={playable.slice(1).map((item) => item.id)}
          autoPlay
          muted={!clicked}
          className="max-w-none border border-rule"
        />
      ) : first ? (
        <div className={cn('relative aspect-video border border-rule bg-surface-raised', scanlines)}>
          <button
            type="button"
            onClick={() => setClicked(true)}
            aria-label={`Tocar os clipes: ${bands}`}
            className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover md:size-24"
          >
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      ) : (
        <CoverScreen clip={clips[0]!} />
      )}

      <p className="mt-3 text-sm text-muted">
        {first && !clicked && !reduced && 'O vídeo começa sem som; ligue no botão do player. '}
        Clipes de{' '}
        {clips.map((clip, position) => (
          <span key={clip.id}>
            {position > 0 && ', '}
            <Link
              to={`/artistas/${clip.artistSlug}`}
              className="text-ink underline underline-offset-4 hover:text-accent"
            >
              {clip.band}
            </Link>
          </span>
        ))}
        .
      </p>
    </section>
  )
}

/** Sem nenhum clipe com link, a tela mostra a capa da primeira banda e o caminho para a página dela. */
function CoverScreen({ clip }: { clip: Clip }) {
  const artist = useArtist(clip.artistSlug)
  const cover = artist.data?.releases.find((release) => release.cover)?.cover ?? artist.data?.image ?? null

  return (
    <div className={cn('relative overflow-hidden border border-rule bg-surface-raised sm:aspect-video', scanlines)}>
      <div className="grid grid-cols-1 sm:h-full sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {cover ? (
          <img
            src={cover.large}
            alt={`Capa de ${clip.band}`}
            className="aspect-video size-full object-cover sm:aspect-auto"
          />
        ) : (
          <div aria-hidden="true" className="aspect-video size-full bg-surface sm:aspect-auto" />
        )}
        <div className="flex flex-col justify-between p-5 md:p-8">
          <span className="w-fit bg-badge px-2.5 py-0.5 font-display text-xs text-on-accent">AGORA</span>
          <div>
            <p className="font-display text-2xl leading-tight md:text-4xl">{clip.band}</p>
            <p className="mt-1 text-sm text-muted">O clipe entra no ar em breve.</p>
            <Link
              to={`/artistas/${clip.artistSlug}`}
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-extrabold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Ver a banda
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
