import { useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import {
  getArtist,
  getGenre,
  getGenreTree,
  getRelease,
  listArtists,
  listReleases,
  type ArtistListParams,
  type ReleaseListParams,
} from '../api/catalog-api'

/** Um cadastro inexistente não passa a existir numa segunda tentativa; servidor acordando, sim. */
const retryUnlessNotFound = shouldRetry

export const useGenreTree = () => useQuery({ queryKey: ['genres'], queryFn: getGenreTree })

export const useGenre = (slug: string) =>
  useQuery({ queryKey: ['genre', slug], queryFn: () => getGenre(slug), retry: retryUnlessNotFound, retryDelay })

export const useArtistList = (params: ArtistListParams, enabled = true) =>
  useQuery({ queryKey: ['artists', params], queryFn: () => listArtists(params), placeholderData: (previous) => previous, enabled })

export const useArtist = (slug: string) =>
  useQuery({ queryKey: ['artist', slug], queryFn: () => getArtist(slug), retry: retryUnlessNotFound, retryDelay })

export const useReleaseList = (params: ReleaseListParams, enabled = true) =>
  useQuery({ queryKey: ['releases', params], queryFn: () => listReleases(params), placeholderData: (previous) => previous, enabled })

export const useRelease = (slug: string) =>
  useQuery({ queryKey: ['release', slug], queryFn: () => getRelease(slug), retry: retryUnlessNotFound, retryDelay })

/**
 * Depois de qualquer alteração no catálogo, refaz as consultas relacionadas. O catálogo é
 * pequeno e as telas se cruzam (a discografia do artista muda ao editar um lançamento),
 * então invalidar tudo é mais simples e seguro do que decidir caso a caso.
 */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['genres', 'genre', 'artists', 'artist', 'releases', 'release'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )
}
