import { parseFacts, parseSources } from './catalog.mappers.js';

describe('parseSources', () => {
  it('mantém fontes válidas', () => {
    const sources = [
      { name: 'Wikipédia', url: 'https://pt.wikipedia.org/wiki/X' },
    ];

    expect(parseSources(sources)).toEqual(sources);
  });

  it('descarta itens malformados e links que não são http(s)', () => {
    expect(
      parseSources([
        { name: 'ok', url: 'http://exemplo.com' },
        { name: 'perigoso', url: 'javascript:alert(1)' },
        { name: 'sem link' },
        'texto solto',
        null,
      ]),
    ).toEqual([{ name: 'ok', url: 'http://exemplo.com' }]);
  });

  it('devolve lista vazia quando o campo não é uma lista', () => {
    expect(parseSources(null)).toEqual([]);
    expect(parseSources({ name: 'x' })).toEqual([]);
  });
});

describe('parseFacts', () => {
  const fact = { text: 'Uma curiosidade.', sourceName: 'Wikipédia (pt)', sourceUrl: 'https://pt.wikipedia.org/wiki/X' };

  it('mantém curiosidades completas', () => {
    expect(parseFacts([fact])).toEqual([fact]);
  });

  it('descarta as incompletas ou com link que não seja https', () => {
    expect(
      parseFacts([
        fact,
        { ...fact, text: '  ' },
        { ...fact, sourceName: '' },
        { ...fact, sourceUrl: 'javascript:alert(1)' },
        { ...fact, sourceUrl: 'http://exemplo.com' },
        'texto solto',
        null,
      ]),
    ).toEqual([fact]);
  });

  it('devolve lista vazia quando não há curiosidades', () => {
    expect(parseFacts(null)).toEqual([]);
    expect(parseFacts({ text: 'x' })).toEqual([]);
  });
});
