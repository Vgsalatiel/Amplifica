import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import {
  createComment,
  deleteComment,
  dismissReports,
  listComments,
  listReportedComments,
  reportComment,
} from '../api/comments-api'

export const useComments = (slug: string) =>
  useQuery({ queryKey: ['comments', slug], queryFn: () => listComments(slug), retry: shouldRetry, retryDelay })

export function useCreateComment(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => createComment(slug, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  })
}

/** Apagar vale para o mural e para a fila da moderação: refaz as duas. */
export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  })
}

export const useReportComment = () =>
  useMutation({ mutationFn: (args: { id: string; reason?: string }) => reportComment(args.id, args.reason) })

export const useReportedComments = () =>
  useQuery({ queryKey: ['comments', 'reported'], queryFn: listReportedComments })

export function useDismissReports() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dismissReports,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  })
}
