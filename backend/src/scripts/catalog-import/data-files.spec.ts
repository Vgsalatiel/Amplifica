import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogFileSchema } from './catalog-file.js';

const DATA_DIR = join(process.cwd(), 'prisma', 'data');
const files = readdirSync(DATA_DIR).filter((name) => name.endsWith('.json'));

describe.each(files)('prisma/data/%s', (name) => {
  const result = catalogFileSchema.safeParse(
    JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8')),
  );

  it('segue o formato do catálogo, com os mesmos limites da API', () => {
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('não repete lançamentos, nem entre os que carregam e os pendentes', () => {
    const data = result.data!;
    const ids = [...data.releases, ...data.pending].map(
      (release) => release.mbid,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa só gêneros da árvore inicial', async () => {
    const { GENRE_SEEDS } = await import('../genres-data.js');
    const { slugify } = await import('../../common/slug.js');
    const known = new Set(GENRE_SEEDS.map((genre) => slugify(genre.name)));

    expect(
      result.data!.artist.genres.filter((slug) => !known.has(slug)),
    ).toEqual([]);
  });

  it('não tem faixas com a mesma posição no mesmo disco', () => {
    for (const release of result.data!.releases) {
      const keys = release.tracks.map(
        (track) => `${track.discNumber}:${track.position}`,
      );
      expect(new Set(keys).size, release.title).toBe(keys.length);
    }
  });
});
