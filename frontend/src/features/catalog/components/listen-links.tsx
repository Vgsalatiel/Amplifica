import { listenLinks } from '../lib/listen-links'

const linkClass =
  'block rounded-full transition-transform hover:scale-110 focus-visible:scale-110 motion-reduce:transition-none'

/** Logo do YouTube Music: círculo vermelho, anel branco e o botão de tocar. */
function YouTubeMusicLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-12">
      <circle cx="24" cy="24" r="24" fill="#FF0000" />
      <circle cx="24" cy="24" r="12" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M20.6 17.8 31 24l-10.4 6.2z" fill="#fff" />
    </svg>
  )
}

/** Logo do Spotify: círculo verde e as três ondas escuras. */
function SpotifyLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-12">
      <circle cx="24" cy="24" r="24" fill="#1ED760" />
      <g fill="none" stroke="#000" strokeLinecap="round">
        <path d="M12 18.2c8-2.3 17-1.6 24.2 2.6" strokeWidth="3.4" />
        <path d="M13.2 24.9c6.7-1.9 14.2-1.3 20 2.1" strokeWidth="2.9" />
        <path d="M14.4 31.2c5.3-1.4 11-.9 15.6 1.7" strokeWidth="2.4" />
      </g>
    </svg>
  )
}

/** Só as logos do YouTube Music e do Spotify: cada uma leva ao disco na plataforma, em outra aba. */
export function ListenLinks({
  title,
  artists,
  youtubeVideoId,
}: {
  title: string
  artists: string[]
  youtubeVideoId: string | null
}) {
  const links = listenLinks({ title, artists, youtubeVideoId })
  return (
    <div className="mt-8">
      <p className="font-semibold">Ouvir este disco</p>
      <ul className="mt-3 flex items-center gap-4">
        <li>
          <a
            href={links.youtubeMusic}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ouvir no YouTube Music (abre em outra aba)"
            title="Ouvir no YouTube Music"
            className={linkClass}
          >
            <YouTubeMusicLogo />
          </a>
        </li>
        <li>
          <a
            href={links.spotify}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ouvir no Spotify (abre em outra aba)"
            title="Ouvir no Spotify"
            className={linkClass}
          >
            <SpotifyLogo />
          </a>
        </li>
      </ul>
    </div>
  )
}
