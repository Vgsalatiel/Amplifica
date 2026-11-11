/** Formata uma nota no padrão brasileiro: vírgula decimal e no máximo uma casa. */
export function formatRating(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}
