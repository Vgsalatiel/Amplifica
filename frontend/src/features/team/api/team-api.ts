import { apiFetch } from '../../../lib/api-client'
import type { TeamMember } from '../../../types/api'

/** A equipe do site: administradores e moderadores (só administradores consultam). */
export const listTeam = () => apiFetch<TeamMember[]>('/team')

/** Promove alguém a moderador ou devolve o papel de usuário comum. `username` pode vir com "@". */
export const setTeamRole = (username: string, role: 'MODERATOR' | 'USER') =>
  apiFetch<TeamMember>(`/team/${encodeURIComponent(username)}`, { method: 'PUT', json: { role } })
