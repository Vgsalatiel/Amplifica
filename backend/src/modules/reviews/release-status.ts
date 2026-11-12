/**
 * Um disco só recebe nota depois de lançado. A data guardada decide: para um disco de que se
 * sabe só o ano, ela é 1º de janeiro (o primeiro dia em que ele poderia ter saído), então
 * "2026" já pode ser avaliado em 2026. Sem relógio fixo aqui, os testes passam a data.
 */
export function isReleased(releaseDate: Date, now: Date = new Date()): boolean {
  return releaseDate.getTime() <= now.getTime();
}
