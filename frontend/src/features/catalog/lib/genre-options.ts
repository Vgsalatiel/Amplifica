import type { GenreNode } from '../../../types/api'

export interface GenreOption {
  id: string
  name: string
  depth: number
}

/** Achata a árvore em uma lista ordenada, com a profundidade de cada gênero (para recuar na tela). */
export function flattenGenres(tree: GenreNode[], depth = 0): GenreOption[] {
  return tree.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenGenres(node.children, depth + 1),
  ])
}

/** Ids de um gênero e de todos os seus descendentes. */
export function idsWithDescendants(tree: GenreNode[], id: string): Set<string> {
  const found = new Set<string>()

  const collect = (node: GenreNode, inside: boolean) => {
    const include = inside || node.id === id
    if (include) {
      found.add(node.id)
    }
    node.children.forEach((child) => collect(child, include))
  }
  tree.forEach((node) => collect(node, false))
  return found
}

export interface GenreSlugOption {
  slug: string
  name: string
  depth: number
}

/** Como `flattenGenres`, mas com o endereço (slug) do gênero: é o que os filtros guardam na URL. */
export function flattenGenreSlugs(tree: GenreNode[], depth = 0): GenreSlugOption[] {
  return tree.flatMap((node) => [
    { slug: node.slug, name: node.name, depth },
    ...flattenGenreSlugs(node.children, depth + 1),
  ])
}
