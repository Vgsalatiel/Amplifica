/** Média e quantidade de notas de um disco. */
export interface RatingSummary {
  /** Média com uma casa decimal, ou `null` quando ninguém avaliou ainda. */
  average: number | null;
  count: number;
}

/**
 * Monta o resumo a partir do que o banco devolve. A média é arredondada para uma casa
 * (7,666 vira 7,7), que é como a tela a mostra; sem nenhuma nota, não há média.
 */
export function toRatingSummary(
  average: number | null,
  count: number,
): RatingSummary {
  if (count === 0 || average === null) {
    return { average: null, count: 0 };
  }
  return { average: Math.round(average * 10) / 10, count };
}
