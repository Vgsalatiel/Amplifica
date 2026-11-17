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
      className="inline-flex min-h-11 items-center rounded-full border-2 border-rule-strong px-4 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
    >
      {name}
    </Link>
  )
}
