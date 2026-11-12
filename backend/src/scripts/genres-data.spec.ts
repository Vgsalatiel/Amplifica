import { slugify } from '../common/slug.js';
import { GENRE_SEEDS } from './genres-data.js';

describe('GENRE_SEEDS', () => {
  it('não repete nomes nem endereços', () => {
    const names = GENRE_SEEDS.map((genre) => genre.name.toLowerCase());
    const slugs = GENRE_SEEDS.map((genre) => slugify(genre.name));

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('declara cada pai antes dos filhos', () => {
    const seen = new Set<string>();
    for (const genre of GENRE_SEEDS) {
      if (genre.parent) {
        expect(
          seen.has(genre.parent),
          `${genre.name} vem antes de ${genre.parent}`,
        ).toBe(true);
      }
      seen.add(genre.name);
    }
  });
});
