import { Link } from 'react-router'
import { Container } from './container'

export function SiteFooter() {
  return (
    <footer>
      <div aria-hidden="true" className="stripes h-2" />
      <div className="bg-accent text-on-accent">
        <Container className="flex flex-col gap-2 py-8 text-sm font-medium md:flex-row md:justify-between">
          <div className="flex flex-col gap-2">
            <p>Amplifica: discografias, notas e resenhas de quem ouve rock.</p>
            <p className="max-w-xl">
              Dados de discos do{' '}
              <a href="https://musicbrainz.org" className="font-bold underline underline-offset-4 hover:no-underline">
                MusicBrainz
              </a>
              . Capas do{' '}
              <a
                href="https://coverartarchive.org"
                className="font-bold underline underline-offset-4 hover:no-underline"
              >
                Cover Art Archive
              </a>
              ; os direitos das capas e das fotos pertencem aos respectivos titulares. Para pedir a remoção de uma
              imagem,{' '}
              <a
                href="https://github.com/Vgsalatiel/Amplifica/issues"
                className="font-bold underline underline-offset-4 hover:no-underline"
              >
                abra uma issue no GitHub
              </a>
              .
            </p>
            <nav aria-label="Informações legais" className="flex flex-wrap gap-x-5">
              <Link to="/termos" className="min-h-6 font-bold underline underline-offset-4 hover:no-underline">
                Termos de uso
              </Link>
              <Link to="/privacidade" className="min-h-6 font-bold underline underline-offset-4 hover:no-underline">
                Privacidade
              </Link>
              <Link to="/seguranca" className="min-h-6 font-bold underline underline-offset-4 hover:no-underline">
                Segurança
              </Link>
            </nav>
          </div>
          <p>
            Projeto de portfólio com código aberto no{' '}
            <a
              href="https://github.com/Vgsalatiel/Amplifica"
              className="font-bold underline underline-offset-4 hover:no-underline"
            >
              GitHub
            </a>
            .
          </p>
        </Container>
      </div>
    </footer>
  )
}
