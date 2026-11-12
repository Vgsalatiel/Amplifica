import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../lib/http'
import {
  getArtist,
  getGenreTree,
  getRelease,
  listArtists,
  listReleases,
  type ArtistListParams,
  type ReleaseListParams,
} from '../api/catalog-api'

/** Um cadastro inexistente não passa a existir numa segunda tentativa. */
const retryUnlessNotFound = (count: number, error: unknown) =>
  !(error instanceof ApiError && error.status === 404) && count < 1

export const useGenreTree = () => useQuery({ queryKey: ['genres'], queryFn: getGenreTree })

export const useArtistList = (params: ArtistListParams) =>
  useQuery({ queryKey: ['artists', params], queryFn: () => listArtists(params), placeholderData: (previous) => previous })

export const useArtist = (slug: string) =>
  useQuery({ queryKey: ['artist', slug], queryFn: () => getArtist(slug), retry: retryUnlessNotFound })

export const useReleaseList = (params: ReleaseListParams) =>
  useQuery({ queryKey: ['releases', params], queryFn: () => listReleases(params), placeholderData: (previous) => previous })

export const useRelease = (slug: string) =>
  useQuery({ queryKey: ['release', slug], queryFn: () => getRelease(slug), retry: retryUnlessNotFound })

/**
 * Depois de qualquer alteração no catálogo, refaz as consultas relacionadas. O catálogo é
 * pequeno e as telas se cruzam (a discografia do artista muda ao editar um lançamento),
 * então invalidar tudo é mais simples e seguro do que decidir caso a caso.
 */
export function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['genres', 'artists', 'artist', 'releases', 'release'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )
}
