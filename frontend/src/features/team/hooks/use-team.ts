import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTeam, setTeamRole } from '../api/team-api'

export const useTeam = () => useQuery({ queryKey: ['team'], queryFn: listTeam })

export function useSetTeamRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { username: string; role: 'MODERATOR' | 'USER' }) => setTeamRole(args.username, args.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  })
}
