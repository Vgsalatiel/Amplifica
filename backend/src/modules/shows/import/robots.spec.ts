import { describe, expect, it } from 'vitest';
import { isAllowedByRobots, parseRobots } from './robots.js';

const TOKEN = 'catalog-import';
const allowed = (text: string, path: string) =>
  isAllowedByRobots(parseRobots(text, TOKEN), path);

describe('robots.txt', () => {
  it('sem regras, tudo é permitido', () => {
    expect(allowed('', '/evento/1')).toBe(true);
    expect(allowed('User-agent: *\nDisallow:\n', '/qualquer')).toBe(true);
  });

  it('respeita Disallow do grupo *', () => {
    const text = 'User-agent: *\nDisallow: /admin/\nDisallow: /carrinho/\n';
    expect(allowed(text, '/admin/painel')).toBe(false);
    expect(allowed(text, '/carrinho/')).toBe(false);
    expect(allowed(text, '/evento/bangers')).toBe(true);
  });

  it('a regra mais específica vence, e Allow vence o empate', () => {
    const text = 'User-agent: *\nDisallow: /evento/\nAllow: /evento/publico\n';
    expect(allowed(text, '/evento/privado')).toBe(false);
    expect(allowed(text, '/evento/publico/1')).toBe(true);
    expect(allowed('User-agent: *\nDisallow: /x\nAllow: /x\n', '/x')).toBe(
      true,
    );
  });

  it('entende * e $', () => {
    const text = 'User-agent: *\nDisallow: /*?preview=\nDisallow: /*.pdf$\n';
    expect(allowed(text, '/evento/1?preview=1')).toBe(false);
    expect(allowed(text, '/arquivo.pdf')).toBe(false);
    expect(allowed(text, '/arquivo.pdf.html')).toBe(true);
    expect(allowed(text, '/evento/1')).toBe(true);
  });

  it('usa o grupo do nosso agente quando ele existe, em vez do *', () => {
    const text = [
      'User-agent: *',
      'Allow: /',
      'User-agent: catalog-import',
      'Disallow: /',
    ].join('\n');
    expect(allowed(text, '/evento/1')).toBe(false);
  });

  it('bloqueios a outros robôs não valem para nós', () => {
    const text =
      'User-agent: *\nAllow: /\nUser-agent: ClaudeBot\nUser-agent: CCBot\nDisallow: /\n';
    expect(allowed(text, '/evento/1')).toBe(true);
  });

  it('vários User-agent seguidos dividem o mesmo grupo', () => {
    const text =
      'User-agent: GPTBot\nUser-agent: catalog-import\nDisallow: /privado\n';
    expect(allowed(text, '/privado/a')).toBe(false);
    expect(allowed(text, '/publico')).toBe(true);
  });

  it('ignora comentários e linhas inválidas', () => {
    const text =
      '# comentário\nUser-agent: * # todos\nDisallow: /a # só /a\nlixo sem dois pontos\n';
    expect(allowed(text, '/a/b')).toBe(false);
    expect(allowed(text, '/b')).toBe(true);
  });
});
