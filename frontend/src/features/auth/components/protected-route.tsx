import { Navigate, Outlet, useLocation } from 'react-router'
import { Container } from '../../../components/layout/container'
import { useSession } from '../hooks/use-session'

/**
 * Envolve rotas que exigem login. Visitantes vão para /entrar e, depois de entrar,
 * voltam para a página que tentaram abrir.
 *
 * Isto é conveniência de navegação, não segurança: quem protege os dados é a API,
 * que recusa qualquer chamada sem token válido.
 */
export function ProtectedRoute() {
  const session = useSession()
  const location = useLocation()

  if (session.status === 'loading') {
    return (
      <Container className="pt-16">
        <p className="text-muted">Carregando…</p>
      </Container>
    )
  }

  if (session.status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
