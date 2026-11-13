import { describe, expect, it } from 'vitest';
import {
  createShowSchema,
  listShowsSchema,
  updateShowSchema,
} from './shows.schemas.js';

const valid = {
  date: '2027-03-15',
  venue: 'Allianz Parque',
  city: 'São Paulo',
  state: 'SP',
  acts: [{ name: 'Linkin Park' }],
};

describe('createShowSchema', () => {
  it('aceita o mínimo e preenche o padrão', () => {
    const parsed = createShowSchema.parse(valid);
    expect(parsed.status).toBe('CONFIRMED');
    expect(parsed.acts).toEqual([{ name: 'Linkin Park' }]);
  });

  it('normaliza a sigla do estado para maiúsculas', () => {
    expect(createShowSchema.parse({ ...valid, state: ' sp ' }).state).toBe(
      'SP',
    );
  });

  it.each([
    ['estado inexistente', { state: 'XX' }],
    ['data impossível', { date: '2027-02-30' }],
    ['data muito antiga', { date: '1999-01-01' }],
    ['data muito distante', { date: '2099-01-01' }],
    ['horário inválido', { startTime: '25:00' }],
    ['link sem http', { ticketUrl: 'javascript:alert(1)' }],
    ['sem bandas', { acts: [] }],
    ['banda sem nome', { acts: [{ name: '  ' }] }],
    ['local vazio', { venue: ' ' }],
    ['status desconhecido', { status: 'MAYBE' }],
  ])('recusa %s', (_label, change) => {
    expect(createShowSchema.safeParse({ ...valid, ...change }).success).toBe(
      false,
    );
  });

  it('aceita show já passado (histórico)', () => {
    expect(
      createShowSchema.safeParse({ ...valid, date: '2024-05-01' }).success,
    ).toBe(true);
  });

  it('transforma horário e link vazios em null', () => {
    const parsed = createShowSchema.parse({
      ...valid,
      startTime: '',
      ticketUrl: '',
    });
    expect(parsed.startTime).toBeNull();
    expect(parsed.ticketUrl).toBeNull();
  });

  it('remove gêneros repetidos', () => {
    const id = '0190d4e0-0000-7000-8000-000000000001';
    expect(
      createShowSchema.parse({ ...valid, genreIds: [id, id] }).genreIds,
    ).toEqual([id]);
  });
});

describe('updateShowSchema', () => {
  it('status ausente não vira "confirmado"', () => {
    expect(updateShowSchema.parse({ city: 'Curitiba' }).status).toBeUndefined();
  });
});

describe('listShowsSchema', () => {
  it('padrão: próximos shows, página 1', () => {
    const parsed = listShowsSchema.parse({});
    expect(parsed).toMatchObject({ when: 'upcoming', page: 1, limit: 20 });
  });

  it('normaliza o estado e valida o mês', () => {
    expect(listShowsSchema.parse({ state: 'rj' }).state).toBe('RJ');
    expect(listShowsSchema.safeParse({ month: '2027-13' }).success).toBe(false);
    expect(listShowsSchema.safeParse({ month: '2027-03' }).success).toBe(true);
  });
});
