import { Container } from './container'

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <p>Amplifica: discografias, notas e resenhas de quem ouve rock.</p>
          <p className="max-w-xl">
            Dados de discos do{' '}
            <a href="https://musicbrainz.org" className="text-ink underline underline-offset-4 hover:text-accent">
              MusicBrainz
            </a>
            . Capas do{' '}
            <a href="https://coverartarchive.org" className="text-ink underline underline-offset-4 hover:text-accent">
              Cover Art Archive
            </a>
            ; os direitos das capas pertencem aos respectivos titulares. Para pedir a remoção de uma capa,{' '}
            <a
              href="https://github.com/Vgsalatiel/Amplifica/issues"
              className="text-ink underline underline-offset-4 hover:text-accent"
            >
              abra uma issue no GitHub
            </a>
            .
          </p>
        </div>
        <p>
          Projeto de portfólio com código aberto no{' '}
          <a
            href="https://github.com/Vgsalatiel/Amplifica"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            GitHub
          </a>
          .
        </p>
      </Container>
    </footer>
  )
}
