import { isReleased } from './release-status.js';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('isReleased', () => {
  const now = new Date('2026-11-12T15:00:00Z');

  it('discos de datas passadas estão lançados', () => {
    expect(isReleased(day('2013-03-29'), now)).toBe(true);
  });

  it('um disco que sai hoje já pode ser avaliado', () => {
    expect(isReleased(day('2026-11-12'), now)).toBe(true);
  });

  it('discos de datas futuras não estão lançados', () => {
    expect(isReleased(day('2026-11-13'), now)).toBe(false);
    expect(isReleased(day('2027-01-01'), now)).toBe(false);
  });

  it('com só o ano conhecido (1º de janeiro), o ano corrente já vale', () => {
    expect(isReleased(day('2026-01-01'), now)).toBe(true);
    expect(isReleased(day('2027-01-01'), now)).toBe(false);
  });
});
