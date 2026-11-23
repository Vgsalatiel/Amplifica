import { anniversaryRanges } from './anniversary.js';

describe('anniversaryRanges', () => {
  it('devolve o mês de hoje, N anos atrás, para cada idade', () => {
    const ranges = anniversaryRanges(new Date('2026-11-23T12:00:00Z'), [10, 20]);
    expect(ranges).toEqual([
      { gte: new Date('2016-11-01T00:00:00Z'), lt: new Date('2016-12-01T00:00:00Z') },
      { gte: new Date('2006-11-01T00:00:00Z'), lt: new Date('2006-12-01T00:00:00Z') },
    ]);
  });

  it('em dezembro, o fim da faixa vira janeiro do ano seguinte', () => {
    const [range] = anniversaryRanges(new Date('2026-12-05T00:00:00Z'), [15]);
    expect(range).toEqual({
      gte: new Date('2011-12-01T00:00:00Z'),
      lt: new Date('2012-01-01T00:00:00Z'),
    });
  });

  it('ignora idades repetidas ou inválidas', () => {
    expect(anniversaryRanges(new Date('2026-01-10T00:00:00Z'), [10, 10, 0, -5])).toHaveLength(1);
  });
});
