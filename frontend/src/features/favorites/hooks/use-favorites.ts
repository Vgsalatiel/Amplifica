import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import { addFavorite, getMyFavorite, listFavorites, removeFavorite, type MyFavorite } from '../api/favorites-api'

/** A banda está entre as favoritas de quem está logado? Só pergunta se há sessão. */
export const useMyFavorite = (slug: string, enabled: boolean) =>
  useQuery({ queryKey: ['favorite', slug], queryFn: () => getMyFavorite(slug), enabled })

/**
 * Marca ou tira a estrela. A estrela muda na hora (atualização otimista) e volta ao que era se o
 * servidor recusar. Depois, refaz a lista de favoritas dos perfis.
 */
export function useToggleFavorite(slug: string) {
  const queryClient = useQueryClient()
  const key = ['favorite', slug]
  return useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await addFavorite(slug)
      } else {
        await removeFavorite(slug)
      }
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MyFavorite>(key)
      queryClient.setQueryData<MyFavorite>(key, { favorite: next })
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: ['user-favorites'] })
    },
  })
}

/** As bandas favoritas de um perfil (público). */
export const useUserFavorites = (username: string) =>
  useQuery({
    queryKey: ['user-favorites', username],
    queryFn: () => listFavorites(username),
    retry: shouldRetry,
    retryDelay,
  })
