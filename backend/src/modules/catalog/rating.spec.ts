import { toRatingSummary } from './rating.js';

describe('toRatingSummary', () => {
  it('arredonda a média para uma casa decimal', () => {
    expect(toRatingSummary(23 / 3, 3)).toEqual({ average: 7.7, count: 3 });
    expect(toRatingSummary(7.5, 4)).toEqual({ average: 7.5, count: 4 });
    expect(toRatingSummary(9, 1)).toEqual({ average: 9, count: 1 });
  });

  it('sem nenhuma nota, não há média', () => {
    expect(toRatingSummary(null, 0)).toEqual({ average: null, count: 0 });
    expect(toRatingSummary(0, 0)).toEqual({ average: null, count: 0 });
  });
});
