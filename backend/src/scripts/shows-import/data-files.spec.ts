import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slugify } from '../../common/slug.js';
import { GENRE_SEEDS } from '../genres-data.js';
import { showsFileSchema } from './shows-file.js';

const DATA_DIR = join(process.cwd(), 'prisma', 'data', 'shows');
const files = readdirSync(DATA_DIR).filter((name) => name.endsWith('.json'));

describe.each(files)('prisma/data/shows/%s', (name) => {
  const result = showsFileSchema.safeParse(
    JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8')),
  );

  it('segue o formato de shows, com os mesmos limites da API', () => {
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('usa só gêneros da árvore inicial', () => {
    const known = new Set(GENRE_SEEDS.map((genre) => slugify(genre.name)));
    const used = result.data!.shows.flatMap((show) => show.genres);

    expect(used.filter((slug) => !known.has(slug))).toEqual([]);
  });

  it('não repete o mesmo show (dia, cidade, local e primeira banda)', () => {
    const keys = result.data!.shows.map((show) =>
      [show.date, show.city, show.venue, show.acts[0]?.name]
        .join('|')
        .toLowerCase(),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('só tem links https de páginas, nunca endereços internos', () => {
    for (const show of result.data!.shows) {
      const url = new URL(show.ticketUrl);
      expect(url.protocol, show.ticketUrl).toBe('https:');
      expect(url.hostname, show.ticketUrl).toMatch(/\./);
    }
  });

  it('não tem data de conferência no futuro', () => {
    for (const show of result.data!.shows) {
      expect(show.verifiedAt <= new Date().toISOString().slice(0, 10)).toBe(
        true,
      );
    }
  });
});
