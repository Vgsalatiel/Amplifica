import { Link } from 'react-router'
import type { ImageSet } from '../../../types/api'

/** Foto redonda da pessoa, ou a inicial do nome quando ela não tem foto. */
export function Avatar({ name, avatar, className = 'size-10' }: { name: string; avatar: ImageSet | null; className?: string }) {
  return avatar ? (
    <img src={avatar.small} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-lg ring-1 ring-white/10`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** Linha de uma pessoa nas listas de seguidores e seguindo: foto, nome e @usuário, ligados ao perfil. */
export function PersonRow({ person }: { person: { username: string; displayName: string; avatar: ImageSet | null } }) {
  return (
    <Link to={`/u/${person.username}`} className="group flex items-center gap-4 py-3">
      <Avatar name={person.displayName} avatar={person.avatar} className="size-12" />
      <span className="min-w-0">
        <span className="block font-semibold group-hover:text-accent">{person.displayName}</span>
        <span className="block truncate text-sm text-muted">@{person.username}</span>
      </span>
    </Link>
  )
}
