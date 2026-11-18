import { TextLink } from '../../../components/ui/text-link'
import { LegalPage, LegalSection } from '../components/legal-page'

/** Termos de uso, em /termos. Rascunho até a revisão jurídica. */
export function TermsPage() {
  return (
    <LegalPage title="Termos de uso">
      <LegalSection title="O que é o Amplifica">
        <p>
          O Amplifica é um projeto de portfólio para descobrir bandas de rock e vertentes, ver a agenda de shows e
          conversar com outras pessoas que gostam do mesmo som. Ele é feito sem fins lucrativos.
        </p>
      </LegalSection>

      <LegalSection title="Sua conta">
        <ul className="list-disc pl-6">
          <li>Você precisa informar um e-mail seu e confirmá-lo para comentar, marcar presença e sugerir conteúdo.</li>
          <li>Guarde a sua senha. Quem tiver acesso à conta age em seu nome.</li>
          <li>Uma pessoa, uma conta. Não crie contas para fingir ser outra pessoa.</li>
          <li>
            Você pode excluir a conta quando quiser, em <TextLink to="/conta">Sua conta</TextLink>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="O que você publica">
        <p>
          Avaliações, comentários no mural, clipes e links de grupos sugeridos são de responsabilidade de quem os
          publica. Ao publicar, você garante que o conteúdo é seu ou que você pode compartilhá-lo, e permite que o
          Amplifica o exiba no site.
        </p>
        <p>Não é permitido publicar:</p>
        <ul className="list-disc pl-6">
          <li>ofensas, ameaças, discriminação ou assédio;</li>
          <li>dados pessoais de outras pessoas, como telefone, endereço ou documentos;</li>
          <li>golpes, spam, propaganda ou links que levem a eles;</li>
          <li>conteúdo ilegal ou que viole direitos de terceiros.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Moderação">
        <p>
          Moderadores podem apagar comentários, recusar clipes e grupos e remover conteúdo que quebre estas regras, sem
          aviso prévio. Contas que abusem do site podem ser limitadas ou removidas. Qualquer pessoa com conta pode
          denunciar um comentário.
        </p>
      </LegalSection>

      <LegalSection title="Grupos e links de outros sites">
        <p>
          Os grupos de WhatsApp, Telegram e Discord são criados e administrados por outras pessoas, fora do Amplifica.
          Aprovamos o link, mas não controlamos o que acontece lá dentro e não nos responsabilizamos por ele. Leia{' '}
          <TextLink to="/seguranca">as dicas de segurança</TextLink> antes de encontrar alguém.
        </p>
      </LegalSection>

      <LegalSection title="Shows, datas e ingressos">
        <p>
          As informações da agenda vêm de divulgações públicas e podem mudar. Confira sempre no site do vendedor ou do
          organizador. O Amplifica não vende ingressos e não participa da compra.
        </p>
      </LegalSection>

      <LegalSection title="Imagens e dados de discos">
        <p>
          Capas, fotos e pôsteres pertencem aos respectivos titulares. Para pedir a remoção de uma imagem, abra uma
          issue no repositório do projeto, no GitHub.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilidade e mudanças">
        <p>
          O site é oferecido como está, sem garantia de funcionamento contínuo. Podemos mudar o site e estes termos; a
          data no topo mostra a última alteração. Continuar usando o Amplifica depois de uma mudança significa que você
          concorda com o texto novo.
        </p>
      </LegalSection>

      <LegalSection title="Contato">
        <p>
          Dúvidas, denúncias e pedidos: abra uma issue no repositório do projeto, no GitHub (o link está no rodapé).
          Sobre seus dados pessoais, veja a <TextLink to="/privacidade">Política de privacidade</TextLink>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
