import { parseCookies } from './refresh-cookie.js';

describe('parseCookies', () => {
  it('lê vários cookies', () => {
    expect(parseCookies('a=1; amplifica_refresh=abc.def; b=2')).toEqual({
      a: '1',
      amplifica_refresh: 'abc.def',
      b: '2',
    });
  });

  it('decodifica valores e preserva "=" dentro do valor', () => {
    expect(parseCookies('token=a%20b; chave=x=y')).toEqual({
      token: 'a b',
      chave: 'x=y',
    });
  });

  it('fica com a primeira ocorrência de um nome repetido', () => {
    expect(parseCookies('a=primeiro; a=segundo')).toEqual({ a: 'primeiro' });
  });

  it('devolve objeto vazio sem cabeçalho ou com cabeçalho malformado', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('sem-separador')).toEqual({});
  });
});
