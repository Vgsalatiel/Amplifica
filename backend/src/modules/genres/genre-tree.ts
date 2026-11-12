/** O mínimo que as funções de árvore precisam saber sobre um gênero. */
export interface GenreRow {
  id: string;
  parentId: string | null;
}

export type GenreNode<T extends GenreRow> = T & {
  children: Array<GenreNode<T>>;
};

/** Monta a árvore a partir da lista plana que vem do banco. A ordem da lista é preservada. */
export function buildGenreTree<T extends GenreRow>(
  rows: T[],
): Array<GenreNode<T>> {
  const nodes = new Map<string, GenreNode<T>>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: Array<GenreNode<T>> = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Ids de todos os descendentes de um gênero (filhos, netos...), sem incluir ele mesmo. */
export function descendantIds(rows: GenreRow[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const row of rows) {
    if (row.parentId) {
      childrenOf.set(row.parentId, [
        ...(childrenOf.get(row.parentId) ?? []),
        row.id,
      ]);
    }
  }

  const found: string[] = [];
  const queue = [...(childrenOf.get(rootId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    // Protege contra um ciclo que tenha entrado no banco por fora da API.
    if (id === rootId || found.includes(id)) {
      continue;
    }
    found.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return found;
}
