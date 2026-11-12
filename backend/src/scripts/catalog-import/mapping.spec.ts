import { catalogFileSchema } from './catalog-file.js';
import {
  fitTitle,
  hasUsableDate,
  mapReleaseType,
  pickRepresentativeRelease,
  toTracks,
} from './mapping.js';

describe('mapReleaseType', () => {
  it.each([
    ['Album', [], 'ALBUM'],
    ['Album', ['Live'], 'LIVE'],
    ['Album', ['Compilation'], 'COMPILATION'],
    ['Album', ['Remix'], 'COMPILATION'],
    ['EP', [], 'EP'],
    ['EP', ['Demo'], 'EP'],
    ['EP', ['Remix'], 'EP'],
    ['EP', ['Live'], 'LIVE'],
    ['Single', [], 'SINGLE'],
    ['Single', ['Live'], 'SINGLE'],
    ['Single', ['Remix'], 'SINGLE'],
  ])('%s com %j vira %s', (primary, secondary, expected) => {
    expect(mapReleaseType(primary, secondary)).toBe(expected);
  });

  it('ignora tipos que o catálogo não tem', () => {
    expect(mapReleaseType('Broadcast')).toBeNull();
    expect(mapReleaseType(null)).toBeNull();
  });
});

describe('pickRepresentativeRelease', () => {
  const release = (
    id: string,
    date: string | undefined,
    tracks: number,
    status = 'Official',
  ) => ({
    id,
    title: id,
    status,
    date,
    media: [{ 'track-count': tracks }],
  });

  it('escolhe a edição oficial mais antiga, não a versão de luxo', () => {
    const picked = pickRepresentativeRelease([
      release('luxo', '2013-04-02', 19),
      release('original', '2013-03-29', 13),
      release('japao', '2013-04-03', 15),
    ]);

    expect(picked?.id).toBe('original');
  });

  it('no empate de data, fica com a de menos faixas', () => {
    const picked = pickRepresentativeRelease([
      release('com-bonus', '2013-03-29', 15),
      release('padrao', '2013-03-29', 13),
    ]);

    expect(picked?.id).toBe('padrao');
  });

  it('prefere oficiais, mas usa as demais se não houver nenhuma', () => {
    expect(
      pickRepresentativeRelease([
        release('promo', '2012', 5, 'Promotion'),
        release('oficial', '2013', 13),
      ])?.id,
    ).toBe('oficial');
    expect(
      pickRepresentativeRelease([release('promo', '2012', 5, 'Promotion')])?.id,
    ).toBe('promo');
  });

  it('coloca edições sem data depois das datadas', () => {
    expect(
      pickRepresentativeRelease([
        release('sem-data', undefined, 10),
        release('datada', '2015', 12),
      ])?.id,
    ).toBe('datada');
  });

  it('devolve null sem edições', () => {
    expect(pickRepresentativeRelease([])).toBeNull();
  });
});

describe('toTracks', () => {
  it('numera discos e faixas e converte duração ausente em null', () => {
    const tracks = toTracks([
      {
        position: 1,
        tracks: [
          { position: 1, title: ' Geada ', length: 168000 },
          { position: 2, title: 'Vidro', length: null },
        ],
      },
      {
        position: 2,
        tracks: [{ position: 1, title: 'Interlúdio', length: 0 }],
      },
    ]);

    expect(tracks).toEqual([
      { title: 'Geada', discNumber: 1, position: 1, durationMs: 168000 },
      { title: 'Vidro', discNumber: 1, position: 2, durationMs: null },
      { title: 'Interlúdio', discNumber: 2, position: 1, durationMs: null },
    ]);
  });
});

describe('hasUsableDate', () => {
  it.each(['2013', '2013-03', '2013-03-29'])('aceita %s', (date) => {
    expect(
      hasUsableDate({ id: 'x', title: 'x', 'first-release-date': date }),
    ).toBe(true);
  });

  it.each(['', undefined, '13'])('recusa %s', (date) => {
    expect(
      hasUsableDate({ id: 'x', title: 'x', 'first-release-date': date }),
    ).toBe(false);
  });
});

describe('catalogFileSchema', () => {
  const valid = {
    generatedAt: '2026-11-12T00:00:00Z',
    source: 'musicbrainz',
    artist: {
      mbid: null,
      name: 'Banda',
      slug: 'banda',
      type: 'BAND',
      country: 'GB',
      city: null,
      formedYear: 2004,
      disbandedYear: null,
      bio: null,
      sources: [{ name: 'MusicBrainz', url: 'https://musicbrainz.org' }],
      genres: ['metalcore'],
    },
    releases: [
      {
        mbid: 'g1',
        releaseMbid: 'r1',
        title: 'Disco',
        type: 'ALBUM',
        releaseDate: '2013-03-29',
        description: null,
        coverUrl: null,
        tracks: [
          { title: 'Faixa', discNumber: 1, position: 1, durationMs: 200000 },
        ],
      },
    ],
  };

  it('aceita um arquivo válido', () => {
    expect(catalogFileSchema.safeParse(valid).success).toBe(true);
  });

  it('recusa título longo demais, data inexistente e link perigoso', () => {
    const bad = structuredClone(valid);
    bad.releases[0].title = 'x'.repeat(201);
    bad.releases[0].releaseDate = '2013-02-30';
    bad.artist.sources[0].url = 'javascript:alert(1)';

    const result = catalogFileSchema.safeParse(bad);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining([
        'artist.sources.0.url',
        'releases.0.title',
        'releases.0.releaseDate',
      ]),
    );
  });
});

describe('fitTitle', () => {
  it('mantém títulos dentro do limite', () => {
    expect(fitTitle('  Sempiternal ')).toEqual({
      title: 'Sempiternal',
      description: null,
    });
  });

  it('corta títulos longos num separador e guarda o título completo na descrição', () => {
    const full = `Music to listen to${'~dance to'.repeat(40)}~GO TO`;

    const result = fitTitle(full);

    expect(result.title.length).toBeLessThanOrEqual(200);
    expect(result.title.endsWith('…')).toBe(true);
    expect(result.title.endsWith('~…')).toBe(false);
    expect(result.description).toBe(`Título completo: ${full}`);
  });
});
