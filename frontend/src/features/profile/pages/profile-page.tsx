import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { Container } from '../../../components/layout/container'
import { ButtonLink } from '../../../components/ui/button-link'
import { SectionHeading } from '../../../components/ui/section-heading'
import { TextLink } from '../../../components/ui/text-link'
import { ApiError } from '../../../lib/http'
import { useSession } from '../../auth/hooks/use-session'
import { getProfile } from '../api/profile-api'

function memberSince(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Perfil público em /u/:username. */
export function ProfilePage() {
  const { username = '' } = useParams()
  const session = useSession()
  const profile = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
    // Perfil inexistente não vai passar a existir em uma segunda tentativa.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  })

  if (profile.isPending) {
    return (
      <Container className="pt-16">
        <p className="text-muted">Carregando perfil…</p>
      </Container>
    )
  }

  if (profile.isError) {
    const notFound = profile.error instanceof ApiError && profile.error.status === 404
    return (
      <Container className="pt-16 md:pt-24">
        <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">
          {notFound ? 'Esse perfil não existe' : 'Não foi possível carregar o perfil'}
        </h1>
        <p className="mt-6 max-w-xl font-serif text-xl">
          {notFound
            ? `Ninguém usa o nome "${username}" no Amplifica.`
            : 'O servidor não respondeu. Tente de novo em instantes.'}
        </p>
        <p className="mt-6">
          <TextLink to="/">Voltar para o início</TextLink>
        </p>
      </Container>
    )
  }

  const user = profile.data
  const isOwnProfile = session.status === 'authenticated' && session.user.username === user.username

  return (
    <Container className="pt-12 md:pt-20">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-6">
          {user.avatar && (
            <img src={user.avatar.large} alt={`Foto de ${user.displayName}`} className="size-28 object-cover md:size-36" />
          )}
          <div>
          <h1 className="font-display text-6xl leading-[0.96] font-normal tracking-tight break-words md:text-7xl">
            {user.displayName}
          </h1>
          <p className="mt-3 text-muted">
            @{user.username}, no Amplifica desde {memberSince(user.createdAt)}
          </p>
          </div>
        </div>
        {isOwnProfile && (
          <ButtonLink to="/conta" variant="secondary">
            Editar perfil
          </ButtonLink>
        )}
      </header>

      {user.bio ? (
        <p className="mt-8 max-w-2xl font-serif text-xl whitespace-pre-line">{user.bio}</p>
      ) : (
        isOwnProfile && (
          <p className="mt-8 max-w-2xl text-muted">
            Você ainda não escreveu uma bio. <TextLink to="/conta">Conte o que você ouve</TextLink>.
          </p>
        )
      )}

      <section className="mt-16 border-t border-rule pt-12">
        <SectionHeading>Resenhas</SectionHeading>
        <p className="mt-6 max-w-2xl text-muted">
          {isOwnProfile
            ? 'Suas resenhas vão aparecer aqui quando o catálogo de discos estiver no ar.'
            : `As resenhas de ${user.displayName} vão aparecer aqui quando o catálogo de discos estiver no ar.`}
        </p>
      </section>
    </Container>
  )
}
