/**
 * Junta as atividades de várias fontes (avaliações, favoritas, clipes, shows) numa linha do tempo só,
 * da mais nova para a mais antiga. O feed anda por data ("antes de tal momento"), não por página:
 * assim, atividade nova que chega enquanto a pessoa lê não desloca nem repete itens.
 */
export interface Timed {
  id: string;
  at: Date;
}

export interface FeedPage<T extends Timed> {
  items: T[];
  /** Passe como `before` para pedir a próxima página; `null` quando acabou. */
  next: string | null;
}

export function mergeFeed<T extends Timed>(
  candidates: T[],
  limit: number,
): FeedPage<T> {
  const sorted = [...candidates].sort(
    (a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id),
  );
  const items = sorted.slice(0, limit);
  const hasMore = sorted.length > limit;
  const last = items.at(-1);
  return { items, next: hasMore && last ? last.at.toISOString() : null };
}
