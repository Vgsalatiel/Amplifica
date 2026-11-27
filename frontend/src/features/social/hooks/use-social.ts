import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import {
  followUser,
  getFeed,
  getFollowCounts,
  getFollowState,
  listFollowers,
  listFollowing,
  unfollowUser,
  type FollowState,
} from '../api/social-api'

/** Quem está logado segue esta pessoa? Só pergunta se há sessão. */
export const useFollowState = (username: string, enabled: boolean) =>
  useQuery({ queryKey: ['follow', username], queryFn: () => getFollowState(username), enabled })

/** Seguir ou deixar de seguir: o botão muda na hora e volta ao que era se o servidor recusar. */
export function useToggleFollow(username: string) {
  const queryClient = useQueryClient()
  const key = ['follow', username]
  return useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await followUser(username)
      } else {
        await unfollowUser(username)
      }
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FollowState>(key)
      queryClient.setQueryData<FollowState>(key, { following: next })
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: ['follow-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['follow-list'] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

export const useFollowCounts = (username: string) =>
  useQuery({
    queryKey: ['follow-counts', username],
    queryFn: () => getFollowCounts(username),
    retry: shouldRetry,
    retryDelay,
  })

export const useFollowList = (kind: 'followers' | 'following', username: string) =>
  useQuery({
    queryKey: ['follow-list', kind, username],
    queryFn: () => (kind === 'followers' ? listFollowers(username) : listFollowing(username)),
    retry: shouldRetry,
    retryDelay,
  })

/** O feed de quem a pessoa segue, página por página (por data), para o botão "Ver mais". */
export const useFeed = () =>
  useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  })
