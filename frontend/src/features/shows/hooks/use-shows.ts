import { useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import { getShow, listShows, type ShowListParams } from '../api/shows-api'

export const useShowList = (params: ShowListParams, enabled = true) =>
  useQuery({
    queryKey: ['shows', params],
    queryFn: () => listShows(params),
    placeholderData: (previous) => previous,
    enabled,
  })

export const useShow = (slug: string) =>
  useQuery({ queryKey: ['show', slug], queryFn: () => getShow(slug), retry: shouldRetry, retryDelay })

/** Depois de qualquer alteração em shows, refaz as listas e os detalhes. */
export function useInvalidateShows() {
  const queryClient = useQueryClient()
  return () => Promise.all(['shows', 'show'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}
