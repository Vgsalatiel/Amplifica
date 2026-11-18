import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { retryDelay, shouldRetry } from '../../../lib/retry'
import { getAttendance, getMyAttendance, removeAttendance, setAttendance } from '../api/attendance-api'

export const useAttendance = (slug: string) =>
  useQuery({ queryKey: ['attendance', slug], queryFn: () => getAttendance(slug), retry: shouldRetry, retryDelay })

export const useMyAttendance = (slug: string, enabled: boolean) =>
  useQuery({
    queryKey: ['attendance', slug, 'me'],
    queryFn: () => getMyAttendance(slug),
    enabled,
    retry: shouldRetry,
    retryDelay,
  })

/** Marcar, trocar a escolha do nome e desmarcar: depois de cada um, refaz o total e a situação da pessoa. */
export function useAttendanceActions(slug: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['attendance', slug] })
  const set = useMutation({ mutationFn: (showName: boolean) => setAttendance(slug, showName), onSuccess: refresh })
  const remove = useMutation({ mutationFn: () => removeAttendance(slug), onSuccess: refresh })
  return { set, remove }
}
