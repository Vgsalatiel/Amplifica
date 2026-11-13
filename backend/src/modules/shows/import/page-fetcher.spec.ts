import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PageFetcher, PageFetchError } from './page-fetcher.js';

let server: Server;
let base: string;
const seen: Array<{ url: string; userAgent: string | undefined }> = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    seen.push({ url: req.url ?? '', userAgent: req.headers['user-agent'] });
    const html = (body: string, headers: Record<string, string> = {}) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      });
      res.end(body);
    };

    switch (req.url) {
      case '/robots.txt':
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('User-agent: *\nDisallow: /privado/\n');
        return;
      case '/evento':
        return html('<title>Evento ok</title>');
      case '/privado/evento':
        return html('<title>Não deveria ser lido</title>');
      case '/gzip':
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Encoding': 'gzip',
        });
        res.end(gzipSync('<title>Comprimida</title>'));
        return;
      case '/gzip-enorme':
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Encoding': 'gzip',
        });
        res.end(gzipSync('a'.repeat(200_000)));
        return;
      case '/redireciona':
        res.writeHead(302, { Location: '/evento' });
        res.end();
        return;
      case '/loop':
        res.writeHead(302, { Location: '/loop' });
        res.end();
        return;
      case '/redireciona-para-privado':
        res.writeHead(302, { Location: '/privado/evento' });
        res.end();
        return;
      case '/imagem':
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(Buffer.from([1, 2, 3]));
        return;
      case '/grande':
        return html('x'.repeat(5000));
      case '/erro':
        res.writeHead(500);
        res.end();
        return;
      case '/lento':
        return; // nunca responde
      default:
        res.writeHead(404);
        res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const fetcher = (options = {}) =>
  new PageFetcher({ allowPrivateAddresses: true, ...options });
const failure = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as PageFetchError;
  }
  throw new Error('era esperado um erro');
};

describe('PageFetcher', () => {
  it('lê uma página e se identifica com o agente configurado', async () => {
    seen.length = 0;
    const page = await fetcher({
      userAgent: 'meu-agente/1.0 (teste)',
    }).fetchHtml(`${base}/evento`);

    expect(page.html).toContain('Evento ok');
    expect(seen.find((request) => request.url === '/evento')?.userAgent).toBe(
      'meu-agente/1.0 (teste)',
    );
  });

  it('confere o robots.txt antes e recusa o que ele proíbe, sem pedir a página', async () => {
    seen.length = 0;
    const error = await failure(fetcher().fetchHtml(`${base}/privado/evento`));

    expect(error).toBeInstanceOf(PageFetchError);
    expect(error.code).toBe('blocked_by_robots');
    expect(seen.map((request) => request.url)).toEqual(['/robots.txt']);
  });

  it('guarda o robots.txt: a segunda leitura no mesmo site não o pede de novo', async () => {
    seen.length = 0;
    const instance = fetcher();
    await instance.fetchHtml(`${base}/evento`);
    await instance.fetchHtml(`${base}/evento`);
    expect(
      seen.filter((request) => request.url === '/robots.txt'),
    ).toHaveLength(1);
  });

  it('descomprime respostas gzip e limita o tamanho já descomprimido', async () => {
    expect((await fetcher().fetchHtml(`${base}/gzip`)).html).toContain(
      'Comprimida',
    );
    // Um arquivo pequeno comprimido que vira enorme ao abrir não passa do limite.
    expect(
      (
        await failure(
          fetcher({ maxBytes: 10_000 }).fetchHtml(`${base}/gzip-enorme`),
        )
      ).code,
    ).toBe('too_large');
  });

  it('segue redirecionamentos e informa o endereço final', async () => {
    const page = await fetcher().fetchHtml(`${base}/redireciona`);
    expect(page.url).toBe(`${base}/evento`);
    expect(page.html).toContain('Evento ok');
  });

  it('confere o robots.txt também no destino de um redirecionamento', async () => {
    const error = await failure(
      fetcher().fetchHtml(`${base}/redireciona-para-privado`),
    );
    expect(error.code).toBe('blocked_by_robots');
  });

  it('desiste de redirecionamentos sem fim', async () => {
    const error = await failure(fetcher().fetchHtml(`${base}/loop`));
    expect(error.code).toBe('fetch_failed');
    expect(error.message).toMatch(/vezes demais/);
  });

  it('recusa o que não é página (imagem) e respostas de erro', async () => {
    expect((await failure(fetcher().fetchHtml(`${base}/imagem`))).code).toBe(
      'not_html',
    );
    const notFound = await failure(fetcher().fetchHtml(`${base}/nao-existe`));
    expect(notFound.code).toBe('fetch_failed');
    expect(notFound.message).toMatch(/404/);
    expect(
      (await failure(fetcher().fetchHtml(`${base}/erro`))).message,
    ).toMatch(/500/);
  });

  it('para quando a página passa do limite de tamanho', async () => {
    const error = await failure(
      fetcher({ maxBytes: 1000 }).fetchHtml(`${base}/grande`),
    );
    expect(error.code).toBe('too_large');
  });

  it('desiste quando o site demora demais', async () => {
    const error = await failure(
      fetcher({ timeoutMs: 200 }).fetchHtml(`${base}/lento`),
    );
    expect(error.code).toBe('fetch_failed');
    expect(error.message).toMatch(/demorou/);
  });

  describe('proteção contra acesso a endereços internos (por padrão)', () => {
    const strict = () => new PageFetcher();

    it.each([
      'http://127.0.0.1/evento',
      'http://localhost/evento',
      'http://10.0.0.5/evento',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/evento',
      'http://0.0.0.0/evento',
    ])('recusa %s', async (url) => {
      const error = await failure(strict().fetchHtml(url));
      expect(error.code).toBe('unsafe_url');
    });

    it.each([
      'ftp://exemplo.com/a',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'não é link',
      'http://usuario:senha@exemplo.com/',
      'http://exemplo.com:8080/',
    ])('recusa o endereço %s', async (url) => {
      expect((await failure(strict().fetchHtml(url))).code).toBe('unsafe_url');
    });

    it('não acessa o servidor local nem por nome nem por IP', async () => {
      seen.length = 0;
      const port = new URL(base).port;
      await failure(strict().fetchHtml(`http://localhost:${port}/evento`));
      await failure(strict().fetchHtml(`${base}/evento`));
      expect(seen).toEqual([]);
    });
  });
});
