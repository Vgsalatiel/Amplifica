import { Link, useParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import { PersonRow } from '../components/person'
import { useFollowList } from '../hooks/use-social'

const TEXT = {
  followers: { title: 'Seguidores', empty: 'ainda não tem seguidores.' },
  following: { title: 'Seguindo', empty: 'ainda não segue ninguém.' },
} as const

/** Quem segue uma pessoa (`followers`) ou quem ela segue (`following`), em /u/:username/seguidores e /seguindo. */
export function FollowListPage({ kind }: { kind: 'followers' | 'following' }) {
  const { username = '' } = useParams()
  useDocumentTitle(`${TEXT[kind].title} de @${username}`)
  const list = useFollowList(kind, username)

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">{TEXT[kind].title}</h1>
      <p className="mt-4 text-xl">
        <Link to={`/u/${username}`} className="underline underline-offset-4 hover:text-accent">
          @{username}
        </Link>
      </p>

      {list.isPending ? (
        <p className="mt-8 text-muted">Carregando…</p>
      ) : list.isError ? (
        <p role="alert" className="mt-8 text-danger">
          Não foi possível carregar a lista. O perfil pode não existir.
        </p>
      ) : list.data.length === 0 ? (
        <p className="mt-8 text-muted">@{username} {TEXT[kind].empty}</p>
      ) : (
        <ul className="mt-8 max-w-xl divide-y divide-rule border-y border-rule">
          {list.data.map((person) => (
            <li key={person.username}>
              <PersonRow person={person} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}

export const FollowersPage = () => <FollowListPage kind="followers" />
export const FollowingPage = () => <FollowListPage kind="following" />
