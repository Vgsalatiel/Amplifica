import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import type { ImageSet } from '../../../types/api'
import { formatShowDay } from '../lib/format-show-day'
import { timeAgo } from '../lib/time-ago'
import type { FeedItem } from '../api/social-api'
import { Avatar } from './person'

const titleLink = 'line-clamp-3 font-display text-xl leading-tight break-words hover:text-accent hover:underline hover:decoration-accent hover:underline-offset-4 md:text-2xl'
const smallLink = 'font-semibold underline decoration-1 underline-offset-4 hover:text-accent'

const VERBS: Record<FeedItem['type'], string> = {
  review: 'avaliou um disco',
  favorite: 'marcou uma banda favorita',
  clip: 'descobriu um clipe',
  attendance: 'vai a um show',
}

/** Ícone pequeno do tipo de atividade, dentro de uma bolinha, para bater o olho. */
function TypeIcon({ type }: { type: FeedItem['type'] }) {
  const paths: Record<FeedItem['type'], ReactNode> = {
    // Disco: círculo com furo.
    review: (
      <>
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <circle cx="12" cy="12" r="2.6" fill="#ffe600" />
      </>
    ),
    // A estrela das favoritas.
    favorite: <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z" fill="currentColor" />,
    clip: <path d="M8 5v14l11-7z" fill="currentColor" />,
    attendance: (
      <path
        d="M7 2v3M17 2v3M3.5 9h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v13a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  }
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
      <svg viewBox="0 0 24 24" className="size-[18px]">
        {paths[type]}
      </svg>
    </span>
  )
}

/** Imagem arredondada: capa de disco (quadrada) ou foto de banda (redonda). */
function Art({ title, image, round = false }: { title: string; image: ImageSet | null; round?: boolean }) {
  return (
    <div className={`size-24 shrink-0 overflow-hidden shadow-lg shadow-black/40 md:size-28 ${round ? 'rounded-full' : 'rounded-2xl'}`}>
      <Cover title={title} image={image} className="size-full" />
    </div>
  )
}

function Body({ item }: { item: FeedItem }) {
  switch (item.type) {
    case 'review':
      return (
        <div className="flex gap-4 md:gap-5">
          <Art title={item.release.title} image={item.release.cover} />
          <div className="min-w-0 flex-1">
            <Link to={`/lancamentos/${item.release.slug}`} className={titleLink}>
              {item.release.title}
            </Link>
            {item.release.artists.length > 0 && <p className="mt-1 text-muted">{item.release.artists.join(', ')}</p>}
            <p className="mt-3 inline-flex items-baseline gap-1 rounded-full bg-accent px-3.5 py-1 text-on-accent">
              <span className="sr-only">Nota </span>
              <strong className="font-display text-lg leading-none">{item.rating}</strong>
              <span aria-hidden="true" className="text-sm font-bold">
                /10
              </span>
              <span className="sr-only"> de 10</span>
            </p>
          </div>
        </div>
      )
    case 'favorite':
      return (
        <div className="flex items-center gap-4 md:gap-5">
          <Art title={item.artist.name} image={item.artist.image} round />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">Banda favorita</p>
            <Link to={`/artistas/${item.artist.slug}`} className={`${titleLink} mt-1 block`}>
              {item.artist.name}
            </Link>
          </div>
        </div>
      )
    case 'clip':
      return (
        <div className="flex items-center gap-4 md:gap-5">
          <div aria-hidden="true" className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-accent/25 to-surface text-accent md:size-28">
            <svg viewBox="0 0 24 24" className="size-10" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 font-display text-xl leading-tight break-words md:text-2xl">{item.clip.title}</p>
            {item.clip.artist && (
              <p className="mt-1 text-muted">
                de{' '}
                <Link to={`/artistas/${item.clip.artist.slug}`} className={smallLink}>
                  {item.clip.artist.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      )
    case 'attendance':
      return (
        <div className="flex items-center gap-4 md:gap-5">
          <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-on-accent md:size-28">
            <span className="font-display text-4xl leading-none">{item.show.date.slice(8, 10).replace(/^0/, '')}</span>
            <span className="mt-1 text-sm font-extrabold">
              {new Date(`${item.show.date}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/shows/${item.show.slug}`} className={titleLink}>
              {item.show.title}
            </Link>
            <p className="mt-1 text-muted">
              {item.show.city}/{item.show.state}, {formatShowDay(item.show.date)}
            </p>
          </div>
        </div>
      )
  }
}

export function FeedItemCard({ item }: { item: FeedItem }) {
  return (
    <article className="rounded-3xl bg-surface-raised p-5 ring-1 ring-white/5 transition-colors hover:ring-white/15 md:p-6">
      <header className="flex items-center gap-3">
        <Avatar name={item.user.displayName} avatar={item.user.avatar} className="size-11" />
        <p className="min-w-0 flex-1 leading-snug">
          <Link to={`/u/${item.user.username}`} className="font-extrabold hover:text-accent">
            {item.user.displayName}
          </Link>{' '}
          <span className="text-muted">{VERBS[item.type]}</span>
          <span className="block text-sm text-muted">
            @{item.user.username} · <time dateTime={item.at}>{timeAgo(item.at)}</time>
          </span>
        </p>
        <TypeIcon type={item.type} />
      </header>

      <div className="mt-5">
        <Body item={item} />
      </div>

      {item.type === 'review' && item.excerpt && (
        <blockquote className="mt-5 rounded-2xl bg-surface/60 px-4 py-3 text-lg leading-relaxed text-ink/90 italic">“{item.excerpt}”</blockquote>
      )}
    </article>
  )
}
