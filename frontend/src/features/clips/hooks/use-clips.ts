import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import type { ClipStatus } from '../../../types/api'
import { deleteClip, getDiscoveries, listClips, listClipsForReview, listMyClips, reviewClip, suggestClip } from '../api/clips-api'

/** A playlist pública. Sem `enabled`: qualquer visitante a vê. */
export const useClipList = () =>
  useQuery({
    queryKey: ['clips', 'list'],
    queryFn: listClips,
    retry: shouldRetry,
    retryDelay,
    // Quem fica assistindo recebe os pedidos aprovados: a lista é pedida de novo a cada minuto.
    refetchInterval: 60_000,
  })

/** As sugestões da pessoa logada. */
export const useMyClips = (enabled: boolean) =>
  useQuery({ queryKey: ['clips', 'mine'], queryFn: listMyClips, enabled, retry: shouldRetry, retryDelay })

/** Sugerir um clipe: depois de enviar, refaz a lista "minhas sugestões". */
export function useSuggestClip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: suggestClip,
    // A sugestão de moderador já entra aprovada: refaz também a playlist, para ela virar a próxima.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips'] }),
  })
}

/** A fila de moderação, por situação (administradores). */
export const useClipsForReview = (status: ClipStatus, enabled = true) =>
  useQuery({ queryKey: ['clips', 'review', status], queryFn: () => listClipsForReview(status), enabled })

/** Depois de qualquer decisão, refaz todas as listas de clipes: a fila, a playlist pública e "minhas sugestões". */
function useInvalidateClips() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['clips'] })
}

export function useReviewClip() {
  const invalidate = useInvalidateClips()
  return useMutation({
    mutationFn: (args: { id: string; input: { status: 'APPROVED' | 'REJECTED'; artistId?: string | null } }) =>
      reviewClip(args.id, args.input),
    onSuccess: invalidate,
  })
}

export function useDeleteClip() {
  const invalidate = useInvalidateClips()
  return useMutation({ mutationFn: deleteClip, onSuccess: invalidate })
}

export const useDiscoveries = (username: string) =>
  useQuery({ queryKey: ['clips', 'discoveries', username], queryFn: () => getDiscoveries(username), retry: shouldRetry, retryDelay })
