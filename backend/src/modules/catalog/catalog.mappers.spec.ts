import { parseSources } from './catalog.mappers.js';

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
