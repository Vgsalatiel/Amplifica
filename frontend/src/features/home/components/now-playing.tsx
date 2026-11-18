import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../../../lib/cn'
import { useArtist } from '../../catalog/hooks/use-catalog'
import { NARRATION, type Clip } from '../lib/clips'
import type { PlaylistItem } from '../lib/playlist'
import { ClipPlayer } from './clip-player'
import { ClipPlaylist } from './clip-playlist'
import { ClipSuggestForm } from './clip-suggest-form'

const scanlines =
  'bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.035)_0,rgb(255_255_255/0.035)_2px,transparent_2px,transparent_6px)]'

/** Quem pediu menos movimento no aparelho não recebe vídeo que começa sozinho. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * "Agora na tela": os clipes da cena passando um depois do outro, numa tela só, com a playlist em
 * lista embaixo e o formulário para sugerir um clipe. O vídeo começa sozinho e sem som (é o que os
 * navegadores permitem); o som se liga no botão do próprio player. Com a preferência de menos
 * movimento, a tela espera o clique no play, e esse clique já toca com som.
 *
 * `items` são os clipes que têm vídeo. Sem nenhum, a tela mostra a capa de `coverClip`, quando existe.
 */
export function NowPlaying({ items, coverClip }: { items: PlaylistItem[]; coverClip?: Clip }) {
  const [reduced] = useState(prefersReducedMotion)
  const [clicked, setClicked] = useState(false)
  const [selected, setSelected] = useState(0)

  if (items.length === 0 && !coverClip) {
    return null
  }
  const current = Math.min(selected, Math.max(items.length - 1, 0))
  const names = items.map((item) => item.subtitle).join(', ')

  function choose(index: number) {
    setSelected(index)
    // Escolher um clipe é um clique: já pode tocar com som, mesmo para quem pediu menos movimento.
    setClicked(true)
  }

  return (
    <section aria-labelledby="agora-titulo">
      <h2 id="agora-titulo" className="font-display text-3xl leading-none text-accent">
        Agora na tela
      </h2>
      <p className="mt-2 mb-4 font-semibold">{NARRATION}</p>

      {items.length > 0 && (!reduced || clicked) ? (
        <ClipPlayer
          videoIds={items.map((item) => item.videoId)}
          title={names}
          muted={!clicked}
          selected={current}
          onIndexChange={setSelected}
        />
      ) : items.length > 0 ? (
        <div className={cn('relative aspect-video border border-rule bg-surface-raised', scanlines)}>
          <button
            type="button"
            onClick={() => setClicked(true)}
            aria-label={`Tocar os clipes: ${names}`}
            className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover md:size-24"
          >
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      ) : (
        <CoverScreen clip={coverClip!} />
      )}

      {items.length > 0 && (
        <>
          <p className="mt-3 mb-3 text-sm text-muted">
            {!clicked && !reduced && 'O vídeo começa sem som; ligue no botão do player. '}
            Toque em um clipe da lista para ouvir.
          </p>
          <ClipPlaylist items={items} current={current} onSelect={choose} />
        </>
      )}

      <ClipSuggestForm />
    </section>
  )
}

/** Enquanto a playlist carrega: o título e uma tela vazia, para a página não pular quando ela chegar. */
export function NowPlayingPlaceholder() {
  return (
    <section aria-labelledby="agora-titulo">
      <h2 id="agora-titulo" className="font-display text-3xl leading-none text-accent">
        Agora na tela
      </h2>
      <p className="mt-2 mb-4 font-semibold">{NARRATION}</p>
      <div aria-hidden="true" className="aspect-video border border-rule bg-surface-raised" />
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
