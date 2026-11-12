import { slugify, slugSchema, uniqueSlug } from './slug.js';

describe('slugify', () => {
  it.each([
    ['Menores Atos', 'menores-atos'],
    ['Tudo Que Sobrou do Inverno!', 'tudo-que-sobrou-do-inverno'],
    ['Coração & Ação', 'coracao-e-acao'],
    ['  CPM 22  ', 'cpm-22'],
    ['LANDMVRKS', 'landmvrks'],
    ['A.F.I.', 'a-f-i'],
    ['---', ''],
  ])('"%s" vira "%s"', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('corta nomes longos sem deixar hífen no fim', () => {
    const slug = slugify(`${'palavra '.repeat(20)}`);

    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('slugSchema', () => {
  it.each(['menores-atos', 'cpm-22', 'a'])('aceita "%s"', (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true);
  });

  it.each(['Menores Atos', 'ação', '-inicio', 'fim-', 'dois--hifens', ''])(
    'recusa "%s"',
    (value) => {
      expect(slugSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('uniqueSlug', () => {
  it('usa o slug base quando está livre', async () => {
    expect(await uniqueSlug('vidro-fosco', () => Promise.resolve(false))).toBe(
      'vidro-fosco',
    );
  });

  it('acrescenta um número quando o slug já existe', async () => {
    const taken = new Set(['vidro-fosco', 'vidro-fosco-2']);

    expect(
      await uniqueSlug('vidro-fosco', (slug) =>
        Promise.resolve(taken.has(slug)),
      ),
    ).toBe('vidro-fosco-3');
  });

  it('tem um nome de reserva para textos sem letras nem números', async () => {
    expect(await uniqueSlug('', () => Promise.resolve(false))).toBe('sem-nome');
  });
});
