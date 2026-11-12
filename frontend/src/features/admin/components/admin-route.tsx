import { Outlet } from 'react-router'
import { Container } from '../../../components/layout/container'
import { TextLink } from '../../../components/ui/text-link'
import { useSession } from '../../auth/hooks/use-session'

/**
 * Deixa passar só quem é administrador. Vem depois do ProtectedRoute, então aqui o
 * visitante já foi mandado para o login. Quem está logado mas não é admin vê o aviso.
 *
 * É conveniência de navegação, não segurança: a API recusa com 403 qualquer escrita
 * no catálogo de quem não é administrador, com ou sem esta tela.
 */
export function AdminRoute() {
  const session = useSession()

  if (session.status === 'authenticated' && session.user.role === 'ADMIN') {
    return <Outlet />
  }

  return (
    <Container className="pt-16 md:pt-24">
      <h1 className="font-display text-5xl leading-none font-normal tracking-tight md:text-6xl">Área restrita</h1>
      <p className="mt-6 max-w-xl font-serif text-xl">
        Só administradores cadastram artistas e lançamentos. Sua conta não tem essa permissão.
      </p>
      <p className="mt-6">
        <TextLink to="/">Voltar para o início</TextLink>
      </p>
    </Container>
  )
}
