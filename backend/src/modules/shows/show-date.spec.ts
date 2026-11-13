import { describe, expect, it } from 'vitest';
import {
  formatShowDate,
  monthRange,
  parseShowDate,
  todayInBrazil,
} from './show-date.js';

describe('parseShowDate', () => {
  it('lê um dia real', () => {
    expect(parseShowDate('2027-03-15')?.toISOString()).toBe(
      '2027-03-15T00:00:00.000Z',
    );
  });

  it('recusa dia que não existe e formato errado', () => {
    for (const text of [
      '2027-02-30',
      '2027-13-01',
      '2027-3-5',
      '15/03/2027',
      '',
      '2027',
    ]) {
      expect(parseShowDate(text)).toBeNull();
    }
  });

  it('aceita 29 de fevereiro só em ano bissexto', () => {
    expect(parseShowDate('2028-02-29')).not.toBeNull();
    expect(parseShowDate('2027-02-29')).toBeNull();
  });

  it('ida e volta com formatShowDate', () => {
    expect(formatShowDate(parseShowDate('2027-12-31') as Date)).toBe(
      '2027-12-31',
    );
  });
});

describe('todayInBrazil', () => {
  it('usa o dia de São Paulo, não o de UTC', () => {
    // 15/03 01:30 UTC ainda é 14/03 22:30 em São Paulo (UTC-3).
    const now = new Date('2027-03-15T01:30:00Z');
    expect(formatShowDate(todayInBrazil(now))).toBe('2027-03-14');
  });

  it('vira o dia às 03:00 UTC', () => {
    expect(
      formatShowDate(todayInBrazil(new Date('2027-03-15T02:59:00Z'))),
    ).toBe('2027-03-14');
    expect(
      formatShowDate(todayInBrazil(new Date('2027-03-15T03:00:00Z'))),
    ).toBe('2027-03-15');
  });
});

describe('monthRange', () => {
  it('vai do dia 1 ao dia 1 do mês seguinte', () => {
    const range = monthRange('2027-03');
    expect(
      range && [formatShowDate(range.start), formatShowDate(range.end)],
    ).toEqual(['2027-03-01', '2027-04-01']);
  });

  it('em dezembro, o fim cai em janeiro do ano seguinte', () => {
    const range = monthRange('2027-12');
    expect(range && formatShowDate(range.end)).toBe('2028-01-01');
  });

  it('recusa mês inválido', () => {
    expect(monthRange('2027-00')).toBeNull();
    expect(monthRange('2027-13')).toBeNull();
    expect(monthRange('2027-3')).toBeNull();
  });
});
