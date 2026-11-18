import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import type { GroupStatus } from '../../../types/api'
import { deleteGroup, listGroups, listGroupsForReview, reviewGroup, suggestGroup } from '../api/groups-api'

export const useGroups = (slug: string) =>
  useQuery({ queryKey: ['groups', slug], queryFn: () => listGroups(slug), retry: shouldRetry, retryDelay })

export const useSuggestGroup = (slug: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => suggestGroup(slug, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export const useGroupsForReview = (status: GroupStatus) =>
  useQuery({ queryKey: ['groups', 'review', status], queryFn: () => listGroupsForReview(status) })

export function useReviewGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; status: 'APPROVED' | 'REJECTED' }) => reviewGroup(args.id, args.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}
