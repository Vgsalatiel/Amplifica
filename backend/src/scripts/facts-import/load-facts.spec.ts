import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { factsFileSchema } from './load-facts.js';

const path = join(process.cwd(), 'prisma', 'data', 'facts', 'facts.json');

describe('prisma/data/facts/facts.json', () => {
  it('existe e segue o formato das curiosidades', () => {
    expect(existsSync(path)).toBe(true);
    const parsed = factsFileSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it('cada banda aparece uma vez e tem uma banda no catálogo', () => {
    const { bands } = factsFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    const slugs = bands.map((band) => band.artist);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(existsSync(join(process.cwd(), 'prisma', 'data', `${slug}.json`))).toBe(true);
    }
  });

  it('não repete a mesma curiosidade', () => {
    const { bands } = factsFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    const texts = bands.flatMap((band) => band.facts.map((fact) => fact.text));
    expect(new Set(texts).size).toBe(texts.length);
  });
});
