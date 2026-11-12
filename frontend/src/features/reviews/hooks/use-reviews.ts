import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../lib/http'
import {
  deleteMyReview,
  deleteReview,
  getMyReview,
  listReviews,
  listUserReviews,
  saveMyReview,
  type ReviewInput,
} from '../api/reviews-api'

export const useReviews = (slug: string, page: number) =>
  useQuery({
    queryKey: ['reviews', slug, page],
    queryFn: () => listReviews(slug, page),
    placeholderData: (previous) => previous,
  })

/**
 * A avaliação de quem está logado. A API responde 404 quando a pessoa ainda não avaliou;
 * isso não é um erro para a tela, e sim "ainda não há avaliação" (`null`).
 */
export const useMyReview = (slug: string, enabled: boolean) =>
  useQuery({
    queryKey: ['my-review', slug],
    enabled,
    queryFn: async () => {
      try {
        return await getMyReview(slug)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404 && error.code === 'review_not_found') {
          return null
        }
        throw error
      }
    },
  })

export const useUserReviews = (username: string, page: number) =>
  useQuery({
    queryKey: ['user-reviews', username, page],
    queryFn: () => listUserReviews(username, page),
    placeholderData: (previous) => previous,
  })

/**
 * Depois de salvar ou apagar uma avaliação, a média do disco, a lista de resenhas, a
 * avaliação da própria pessoa e os perfis mudam. Refaz tudo isso de uma vez.
 */
function useInvalidateReviews() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['release', 'reviews', 'my-review', 'user-reviews'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

export function useSaveMyReview(slug: string) {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: (input: ReviewInput) => saveMyReview(slug, input),
    onSuccess: invalidate,
  })
}

export function useDeleteMyReview(slug: string) {
  const invalidate = useInvalidateReviews()
  return useMutation({ mutationFn: () => deleteMyReview(slug), onSuccess: invalidate })
}

/** Moderação de um administrador (ou o autor) sobre uma avaliação específica. */
export function useDeleteReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({ mutationFn: (id: string) => deleteReview(id), onSuccess: invalidate })
}
