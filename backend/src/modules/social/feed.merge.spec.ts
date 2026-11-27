import { mergeFeed } from './feed.merge.js';

const item = (id: string, iso: string) => ({ id, at: new Date(iso) });

describe('mergeFeed', () => {
  it('ordena da atividade mais nova para a mais antiga, misturando as fontes', () => {
    const page = mergeFeed(
      [item('a', '2026-01-01T10:00:00Z'), item('b', '2026-01-03T10:00:00Z'), item('c', '2026-01-02T10:00:00Z')],
      10,
    );
    expect(page.items.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
    expect(page.next).toBeNull();
  });

  it('corta no limite e devolve a data do último item para pedir a próxima página', () => {
    const page = mergeFeed(
      [item('a', '2026-01-01T10:00:00Z'), item('b', '2026-01-03T10:00:00Z'), item('c', '2026-01-02T10:00:00Z')],
      2,
    );
    expect(page.items.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(page.next).toBe('2026-01-02T10:00:00.000Z');
  });

  it('com exatamente o limite de itens, não há próxima página', () => {
    const page = mergeFeed([item('a', '2026-01-01T10:00:00Z'), item('b', '2026-01-02T10:00:00Z')], 2);
    expect(page.next).toBeNull();
  });

  it('desempata datas iguais pelo id, sempre na mesma ordem', () => {
    const same = '2026-01-01T10:00:00Z';
    expect(mergeFeed([item('b', same), item('a', same)], 5).items.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('lista vazia dá página vazia', () => {
    expect(mergeFeed([], 5)).toEqual({ items: [], next: null });
  });
});
