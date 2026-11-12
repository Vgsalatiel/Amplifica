import { z } from 'zod';

/**
 * Transforma um nome em endereço: "Menores Atos" → "menores-atos",
 * "Tudo Que Sobrou do Inverno!" → "tudo-que-sobrou-do-inverno".
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Slug informado à mão pelo admin. */
export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Digite o endereço.')
  .max(80, 'O endereço pode ter até 80 caracteres.')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Use letras minúsculas, números e hífens, sem espaços nem acentos.',
  );

/**
 * Encontra um slug livre: se "vidro-fosco" já existe, tenta "vidro-fosco-2", "-3"...
 * `isTaken` consulta o banco; quem garante a unicidade no fim é o índice único.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || 'sem-nome';
  let candidate = root;
  for (let suffix = 2; await isTaken(candidate); suffix += 1) {
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}
