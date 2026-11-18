import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import { listClips, listMyClips, suggestClip } from '../api/clips-api'

/** A playlist pública. Sem `enabled`: qualquer visitante a vê. */
export const useClipList = () =>
  useQuery({ queryKey: ['clips', 'list'], queryFn: listClips, retry: shouldRetry, retryDelay })

/** As sugestões da pessoa logada. */
export const useMyClips = (enabled: boolean) =>
  useQuery({ queryKey: ['clips', 'mine'], queryFn: listMyClips, enabled, retry: shouldRetry, retryDelay })

/** Sugerir um clipe: depois de enviar, refaz a lista "minhas sugestões". */
export function useSuggestClip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: suggestClip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips', 'mine'] }),
  })
}
