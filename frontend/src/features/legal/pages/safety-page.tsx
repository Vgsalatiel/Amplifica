import { TextLink } from '../../../components/ui/text-link'
import { LegalPage, LegalSection } from '../components/legal-page'

/** Dicas de segurança para quem combina de ir a shows com gente que conheceu no site, em /seguranca. */
export function SafetyPage() {
  return (
    <LegalPage title="Segurança ao encontrar pessoas">
      <LegalSection title="Antes de ir">
        <ul className="list-disc pl-6">
          <li>Conversar no mural e entrar em grupos é opcional. Entre só se quiser.</li>
          <li>Não passe telefone, endereço, documentos ou dados de pagamento no mural nem para quem acabou de conhecer.</li>
          <li>Desconfie de quem pede dinheiro, “taxa de entrada” ou ingresso adiantado. Compre sempre no site oficial do vendedor.</li>
          <li>Os grupos de WhatsApp, Telegram e Discord são externos e não são administrados pelo Amplifica.</li>
        </ul>
      </LegalSection>

      <LegalSection title="No dia">
        <ul className="list-disc pl-6">
          <li>Encontre as pessoas em lugar público e movimentado, como a fila do show, e de preferência de dia.</li>
          <li>Avise alguém de confiança onde você vai estar e com quem.</li>
          <li>Combine o transporte de volta antes. Você não precisa aceitar carona de quem não conhece.</li>
          <li>Se algo parecer estranho, vá embora. Sua segurança vem antes de qualquer combinado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Se algo der errado">
        <p>
          Denuncie o comentário no próprio mural, para a moderação olhar. Em caso de ameaça ou perigo, ligue 190 (Polícia
          Militar). Mais regras em <TextLink to="/termos">Termos de uso</TextLink>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
