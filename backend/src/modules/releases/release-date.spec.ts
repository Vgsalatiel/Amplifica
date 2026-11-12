import { formatReleaseDate, parseReleaseDate } from './release-date.js';

describe('parseReleaseDate', () => {
  it.each([
    ['2013', 'YEAR', '2013-01-01'],
    ['2013-04', 'MONTH', '2013-04-01'],
    ['2013-04-01', 'DAY', '2013-04-01'],
    ['2024-02-29', 'DAY', '2024-02-29'],
  ])('lê "%s" com precisão %s', (text, precision, iso) => {
    const parsed = parseReleaseDate(text);

    expect(parsed?.precision).toBe(precision);
    expect(parsed?.date.toISOString().slice(0, 10)).toBe(iso);
  });

  it.each([
    '2013-13',
    '2013-02-30',
    '2023-02-29',
    '13',
    '2013/04/01',
    'abril de 2013',
    '1850',
    '',
  ])('recusa "%s"', (text) => {
    expect(parseReleaseDate(text)).toBeNull();
  });
});

describe('formatReleaseDate', () => {
  it('devolve só a parte conhecida da data', () => {
    const date = new Date(Date.UTC(2013, 3, 1));

    expect(formatReleaseDate(date, 'YEAR')).toBe('2013');
    expect(formatReleaseDate(date, 'MONTH')).toBe('2013-04');
    expect(formatReleaseDate(date, 'DAY')).toBe('2013-04-01');
  });

  it('ida e volta preserva o texto original', () => {
    for (const text of ['1999', '2008-11', '2020-10-30']) {
      const parsed = parseReleaseDate(text)!;
      expect(formatReleaseDate(parsed.date, parsed.precision)).toBe(text);
    }
  });
});
