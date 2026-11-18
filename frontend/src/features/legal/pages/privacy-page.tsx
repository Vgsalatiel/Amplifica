import { TextLink } from '../../../components/ui/text-link'
import { LegalPage, LegalSection } from '../components/legal-page'

/** Política de privacidade, em /privacidade. Rascunho até a revisão jurídica. */
export function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade">
      <LegalSection title="Resumo">
        <p>
          Guardamos só o necessário para a sua conta funcionar. Não vendemos dados, não temos propaganda e não usamos
          ferramentas de análise de visitas. Os nomes de quem vai a um show ficam escondidos, a menos que a pessoa
          escolha mostrá-los.
        </p>
      </LegalSection>

      <LegalSection title="O que guardamos">
        <ul className="list-disc pl-6">
          <li>
            <strong>Da conta:</strong> e-mail, nome de usuário, nome de exibição, bio e foto (se você enviar) e a senha,
            guardada apenas de forma criptografada (hash).
          </li>
          <li>
            <strong>O que você faz no site:</strong> avaliações, comentários no mural, presença em shows (“Eu vou”),
            clipes e links de grupos sugeridos, e denúncias que você fizer.
          </li>
          <li>
            <strong>Para manter você logado:</strong> um cookie de sessão e o registro técnico dessa sessão.
          </li>
          <li>
            <strong>Registros técnicos do servidor</strong> (como endereço de IP), usados para segurança e para limitar
            abusos.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="O que é público">
        <ul className="list-disc pl-6">
          <li>Seu perfil: nome de exibição, nome de usuário, bio, foto e data de entrada.</li>
          <li>Suas avaliações e comentários, com o seu nome de exibição.</li>
          <li>Os clipes aprovados que você sugeriu, e o selo de Descobridor.</li>
          <li>
            Seu nome na lista de quem vai a um show <strong>somente se você marcar “Mostrar meu nome”</strong>. Sem
            isso, só entra na contagem.
          </li>
        </ul>
        <p>Seu e-mail nunca aparece para outras pessoas.</p>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <p>
          Para criar e proteger a sua conta, mostrar o que você publicou, enviar e-mails de confirmação e de redefinição
          de senha, moderar o conteúdo e impedir abusos. Não usamos seus dados para outra finalidade.
        </p>
      </LegalSection>

      <LegalSection title="Quem mais participa">
        <ul className="list-disc pl-6">
          <li>Serviços de hospedagem do site, da API e do banco de dados, que guardam os dados por nós.</li>
          <li>Um serviço de envio de e-mails, que recebe o seu e-mail só para entregar as mensagens da conta.</li>
          <li>
            O YouTube, quando você assiste a um clipe. Usamos o modo de privacidade ampliada dele, mas o YouTube pode
            registrar a visualização conforme a política dele.
          </li>
          <li>WhatsApp, Telegram e Discord, se você entrar em um grupo: a partir daí valem as regras deles.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Por quanto tempo">
        <p>
          Enquanto a conta existir. Ao excluí-la, apagamos o seu perfil, e-mail, avaliações, comentários, presenças,
          denúncias e a sessão. Os clipes e links de grupo que você sugeriu e que já foram aprovados continuam no site,
          sem o seu nome. Cópias de segurança do banco podem demorar um pouco para deixar de existir.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Você pode ver e editar seus dados em <TextLink to="/conta">Sua conta</TextLink>, e excluir a conta lá mesmo.
          Para pedir outras informações ou uma correção, abra uma issue no repositório do projeto, no GitHub. Não
          publique dados sensíveis na issue: diga só que quer falar sobre seus dados e combinaremos como.
        </p>
      </LegalSection>

      <LegalSection title="Crianças e adolescentes">
        <p>
          O Amplifica não é voltado a menores de 13 anos. Pessoas entre 13 e 17 anos devem usar o site com o
          conhecimento de um responsável.
        </p>
      </LegalSection>

      <LegalSection title="Mudanças">
        <p>Se algo mudar de forma relevante, a data no topo desta página será atualizada.</p>
      </LegalSection>
    </LegalPage>
  )
}
