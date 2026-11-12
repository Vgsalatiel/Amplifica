import { Link } from 'react-router'
import { Container } from '../../../components/layout/container'
import { PageMessage } from '../../../components/ui/page-state'
import { useDocumentTitle } from '../../../hooks/use-document-title'
import type { GenreNode } from '../../../types/api'
import { useGenreTree } from '../hooks/use-catalog'

/** Todos os gêneros e subgêneros, em /generos. Aberto a qualquer visitante. */
export function GenresPage() {
  useDocumentTitle('Gêneros')
  const tree = useGenreTree()

  if (tree.isError) {
    return <PageMessage title="Não foi possível carregar os gêneros" message="O servidor não respondeu. Tente de novo em instantes." onRetry={() => void tree.refetch()} />
  }

  return (
    <Container className="pt-10 md:pt-16">
      <h1 className="font-display text-6xl leading-none font-normal tracking-tight md:text-7xl">Gêneros</h1>
      <p className="mt-5 max-w-xl font-serif text-xl">
        Do punk ao metal, passando pelo emo e pelo rock alternativo. Escolha um gênero para ver as bandas dele; os subgêneros contam junto.
      </p>

      {tree.isPending ? (
        <p role="status" className="mt-12 text-muted">
          Carregando gêneros…
        </p>
      ) : tree.data.length === 0 ? (
        <p className="mt-12 text-muted">Nenhum gênero cadastrado ainda.</p>
      ) : (
        <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {tree.data.map((genre) => (
            <li key={genre.id}>
              <GenreBranch genre={genre} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}

function GenreBranch({ genre }: { genre: GenreNode }) {
  return (
    <div className="border-t border-rule pt-4">
      <Link
        to={`/generos/${genre.slug}`}
        className="font-display text-3xl leading-tight underline decoration-1 underline-offset-4 hover:text-accent"
      >
        {genre.name}
      </Link>
      {genre.description && <p className="mt-2 text-muted">{genre.description}</p>}
      {genre.children.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-l border-rule pl-4">
          {genre.children.map((child) => (
            <li key={child.id}>
              <Link to={`/generos/${child.slug}`} className="inline-flex min-h-9 items-center underline decoration-1 underline-offset-4 hover:text-accent">
                {child.name}
              </Link>
              {child.children.length > 0 && <GenreSubtree nodes={child.children} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GenreSubtree({ nodes }: { nodes: GenreNode[] }) {
  return (
    <ul className="ml-4 border-l border-rule pl-4">
      {nodes.map((node) => (
        <li key={node.id}>
          <Link to={`/generos/${node.slug}`} className="inline-flex min-h-9 items-center underline decoration-1 underline-offset-4 hover:text-accent">
            {node.name}
          </Link>
          {node.children.length > 0 && <GenreSubtree nodes={node.children} />}
        </li>
      ))}
    </ul>
  )
}
