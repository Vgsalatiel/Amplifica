import { Container } from './container'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted md:flex-row md:justify-between">
        <p>Amplifica: discografias, notas e resenhas de quem ouve rock.</p>
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
