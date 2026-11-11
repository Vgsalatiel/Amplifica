/** Junta nomes de classe, ignorando valores vazios. Evita uma dependência só para isso. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
