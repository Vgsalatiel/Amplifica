import { useLocation } from 'react-router'
import { ButtonLink } from '../../../components/ui/button-link'
import { useSession } from '../../auth/hooks/use-session'

/**
 * Caixa de avaliação do disco. Ver discos, bandas e gêneros não exige conta; avaliar exige.
 * Quem clica em "Criar conta" ou "Entrar" daqui volta a este disco depois (state.from).
 * A avaliação em si chega na etapa seguinte: por ora, quem já tem conta vê um aviso.
 */
export function RatingPrompt() {
  const session = useSession()
  const { pathname } = useLocation()

  // Enquanto a sessão é verificada, não mostra nada: evita piscar o convite para quem já tem conta.
  if (session.status === 'loading') {
    return null
  }

  return (
    <section aria-labelledby="avaliacao-titulo" className="border-t-4 border-accent bg-surface-raised px-6 py-8 md:px-10">
      <h2 id="avaliacao-titulo" className="font-display text-3xl leading-none font-normal italic">
        Já ouviu este disco?
      </h2>
      {session.status === 'anonymous' ? (
        <>
          <p className="mt-4 max-w-xl font-serif text-xl">
            Crie uma conta para dar sua nota e escrever sua resenha. Para ver discos, bandas e gêneros, você não precisa de conta.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <ButtonLink to="/cadastro" state={{ from: pathname }}>
              Criar conta
            </ButtonLink>
            <ButtonLink to="/entrar" state={{ from: pathname }} variant="secondary">
              Entrar
            </ButtonLink>
          </div>
        </>
      ) : (
        <p className="mt-4 max-w-xl font-serif text-xl">
          As avaliações estão chegando. Em breve você poderá dar sua nota e escrever sua resenha por aqui.
        </p>
      )}
    </section>
  )
}
