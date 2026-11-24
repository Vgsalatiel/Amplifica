import { ArtistCard } from '../../../components/catalog/artist-card'
import { TextLink } from '../../../components/ui/text-link'
import { useUserFavorites } from '../hooks/use-favorites'

/** As bandas favoritas no perfil público. Sem nenhuma, quem vê o próprio perfil recebe a dica de como marcar. */
export function UserFavorites({ username, displayName, isOwnProfile }: { username: string; displayName: string; isOwnProfile: boolean }) {
  const favorites = useUserFavorites(username)

  if (favorites.isPending) {
    return <p className="mt-6 text-muted">Carregando as bandas favoritas…</p>
  }
  if (favorites.isError) {
    return (
      <p role="alert" className="mt-6 text-danger">
        Não foi possível carregar as bandas favoritas.
      </p>
    )
  }
  if (favorites.data.length === 0) {
    return (
      <p className="mt-6 max-w-xl text-muted">
        {isOwnProfile ? (
          <>
            Você ainda não marcou nenhuma banda. Toque na estrela na página de uma banda para ela aparecer aqui.{' '}
            <TextLink to="/artistas">Ver as bandas</TextLink>
          </>
        ) : (
          `${displayName} ainda não marcou bandas favoritas.`
        )}
      </p>
    )
  }
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
      {favorites.data.map((artist) => (
        <li key={artist.id}>
          <ArtistCard artist={artist} />
        </li>
      ))}
    </ul>
  )
}
