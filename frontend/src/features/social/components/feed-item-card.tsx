import { Link } from 'react-router'
import { Cover } from '../../../components/catalog/cover'
import { formatShowDay } from '../lib/format-show-day'
import { timeAgo } from '../lib/time-ago'
import type { FeedItem } from '../api/social-api'
import { Avatar } from './person'

const link = 'font-semibold underline decoration-1 underline-offset-4 hover:text-accent'

/** O que a pessoa fez, em uma frase com links, e o que ela fez (capa, nota, trecho da resenha). */
function Action({ item }: { item: FeedItem }) {
  switch (item.type) {
    case 'review':
      return (
        <>
          avaliou{' '}
          <Link to={`/lancamentos/${item.release.slug}`} className={link}>
            {item.release.title}
          </Link>
          {item.release.artists.length > 0 && <>, de {item.release.artists.join(', ')}</>}, com nota <strong>{item.rating}</strong>.
        </>
      )
    case 'favorite':
      return (
        <>
          marcou{' '}
          <Link to={`/artistas/${item.artist.slug}`} className={link}>
            {item.artist.name}
          </Link>{' '}
          como banda favorita.
        </>
      )
    case 'clip':
      return (
        <>
          descobriu o clipe <strong>{item.clip.title}</strong>
          {item.clip.artist && (
            <>
              {' '}
              de{' '}
              <Link to={`/artistas/${item.clip.artist.slug}`} className={link}>
                {item.clip.artist.name}
              </Link>
            </>
          )}
          .
        </>
      )
    case 'attendance':
      return (
        <>
          vai ao show{' '}
          <Link to={`/shows/${item.show.slug}`} className={link}>
            {item.show.title}
          </Link>
          , em {item.show.city}/{item.show.state}, {formatShowDay(item.show.date)}.
        </>
      )
  }
}

export function FeedItemCard({ item }: { item: FeedItem }) {
  const image = item.type === 'review' ? item.release.cover : item.type === 'favorite' ? item.artist.image : null
  const imageTitle = item.type === 'review' ? item.release.title : item.type === 'favorite' ? item.artist.name : ''
  return (
    <article className="flex gap-4 border-b border-rule py-5">
      <Avatar name={item.user.displayName} avatar={item.user.avatar} className="size-12" />
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-snug">
          <Link to={`/u/${item.user.username}`} className="font-extrabold hover:text-accent">
            {item.user.displayName}
          </Link>{' '}
          <Action item={item} />
        </p>
        {item.type === 'review' && item.excerpt && <p className="mt-2 max-w-2xl text-muted">“{item.excerpt}”</p>}
        <p className="mt-2 text-sm text-muted">
          <time dateTime={item.at}>{timeAgo(item.at)}</time>
        </p>
      </div>
      {image && (
        <div className="w-16 shrink-0 md:w-20">
          <Cover title={imageTitle} image={image} />
        </div>
      )}
    </article>
  )
}
