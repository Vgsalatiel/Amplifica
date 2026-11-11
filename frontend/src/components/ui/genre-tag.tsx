import { Link } from 'react-router'

interface GenreTagProps {
  name: string
  to: string
}

/** Etiqueta de gênero: sempre um link, porque gênero é caminho de navegação no Amplifica. */
export function GenreTag({ name, to }: GenreTagProps) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center border border-rule-strong px-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
    >
      {name}
    </Link>
  )
}
