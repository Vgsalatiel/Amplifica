import dns from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { isPublicAddress } from './ip-guard.js';
import { isAllowedByRobots, parseRobots, type RobotsRule } from './robots.js';

export const DEFAULT_USER_AGENT =
  'catalog-import/0.1 (projeto pessoal, sem fins comerciais)';

export type PageFetchErrorCode =
  | 'unsafe_url'
  | 'blocked_by_robots'
  | 'fetch_failed'
  | 'not_html'
  | 'too_large';

/** Falha ao ler uma página; `message` já está em português, pronta para quem está no admin. */
export class PageFetchError extends Error {
  constructor(
    readonly code: PageFetchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface PageFetcherOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Só para testes com servidor local. Em produção a leitura nunca acessa endereços internos. */
  allowPrivateAddresses?: boolean;
}

export interface FetchedPage {
  /** Endereço final, depois dos redirecionamentos. */
  url: string;
  html: string;
}

interface RawResponse {
  status: number;
  headers: IncomingMessage['headers'];
  body: Buffer;
}

const ROBOTS_TTL_MS = 60 * 60 * 1000;

/**
 * Lê uma página pública, uma de cada vez, a pedido de quem está no admin: como a pré-visualização
 * de um link. Respeita o robots.txt do site, só acessa portas 80 e 443, recusa endereços internos
 * (conferidos no momento da conexão, o que também vale para redirecionamentos) e limita tempo e
 * tamanho. Não rastreia o site nem segue links.
 */
export class PageFetcher {
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;
  private readonly allowPrivate: boolean;
  private readonly robotsCache = new Map<
    string,
    { rules: RobotsRule[]; expires: number }
  >();

  constructor(options: PageFetcherOptions = {}) {
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
    this.maxRedirects = options.maxRedirects ?? 3;
    this.allowPrivate = options.allowPrivateAddresses ?? false;
  }

  async fetchHtml(rawUrl: string): Promise<FetchedPage> {
    let url = this.parseUrl(rawUrl);

    for (let hop = 0; hop <= this.maxRedirects; hop += 1) {
      await this.assertAllowedByRobots(url);
      const response = await this.get(url, this.maxBytes);

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.location;
        if (!location) {
          throw this.failed('o site redirecionou sem informar para onde');
        }
        url = this.parseUrl(new URL(location, url).toString());
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        throw this.failed(`o site respondeu ${response.status}`);
      }
      const type = String(response.headers['content-type'] ?? '').toLowerCase();
      if (!type.includes('text/html') && !type.includes('application/xhtml')) {
        throw new PageFetchError(
          'not_html',
          'O endereço não é uma página da web.',
        );
      }
      return { url: url.toString(), html: response.body.toString('utf8') };
    }
    throw this.failed('o site redirecionou vezes demais');
  }

  /** Só http e https, sem usuário e senha no endereço, e só nas portas padrão. */
  private parseUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new PageFetchError(
        'unsafe_url',
        'Esse endereço não é um link válido.',
      );
    }
    const isStandardPort =
      url.port === '' || url.port === '80' || url.port === '443';
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      (!this.allowPrivate && !isStandardPort)
    ) {
      throw new PageFetchError(
        'unsafe_url',
        'Use um link comum de página da web (http ou https).',
      );
    }
    if (
      !this.allowPrivate &&
      isIP(url.hostname.replace(/^\[|\]$/g, '')) !== 0
    ) {
      if (!isPublicAddress(url.hostname.replace(/^\[|\]$/g, ''))) {
        throw new PageFetchError('unsafe_url', 'Esse endereço não é público.');
      }
    }
    return url;
  }

  private async assertAllowedByRobots(url: URL): Promise<void> {
    const rules = await this.robotsFor(url);
    if (!isAllowedByRobots(rules, url.pathname + url.search)) {
      throw new PageFetchError(
        'blocked_by_robots',
        'O site pede, no robots.txt, que visitantes automáticos não leiam esta página. Cadastre o show à mão.',
      );
    }
  }

  private async robotsFor(url: URL): Promise<RobotsRule[]> {
    const cached = this.robotsCache.get(url.origin);
    if (cached && cached.expires > Date.now()) {
      return cached.rules;
    }

    let rules: RobotsRule[];
    try {
      const response = await this.get(new URL('/robots.txt', url), 512 * 1024);
      if (response.status >= 500) {
        throw new Error(`robots.txt respondeu ${response.status}`);
      }
      // Sem robots.txt (404 e afins), nada foi proibido.
      rules =
        response.status >= 200 && response.status < 300
          ? parseRobots(
              response.body.toString('utf8'),
              this.userAgent.split('/')[0] ?? '',
            )
          : [];
    } catch (error) {
      if (error instanceof PageFetchError) {
        throw error;
      }
      // Sem conseguir conferir o que o site pede, o jeito educado é não ler.
      throw this.failed('não foi possível conferir o robots.txt do site');
    }
    this.robotsCache.set(url.origin, {
      rules,
      expires: Date.now() + ROBOTS_TTL_MS,
    });
    return rules;
  }

  private failed(reason: string): PageFetchError {
    return new PageFetchError(
      'fetch_failed',
      `Não foi possível ler a página: ${reason}.`,
    );
  }

  /** Uma requisição GET, sem seguir redirecionamentos, com limite de tempo e de tamanho. */
  private get(url: URL, limit: number): Promise<RawResponse> {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const allowPrivate = this.allowPrivate;

    return new Promise<RawResponse>((resolve, reject) => {
      const req = send(
        url,
        {
          method: 'GET',
          timeout: this.timeoutMs,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          // Cada endereço devolvido pelo DNS é conferido na hora de conectar.
          lookup: guardedLookup(allowPrivate),
        },
        (response) => {
          this.readBody(response, limit).then(
            (body) =>
              resolve({
                status: response.statusCode ?? 0,
                headers: response.headers,
                body,
              }),
            reject,
          );
        },
      );
      req.on('timeout', () =>
        req.destroy(this.failed('o site demorou demais para responder')),
      );
      req.on('error', (error) =>
        reject(
          error instanceof PageFetchError
            ? error
            : this.failed('não foi possível conectar ao site'),
        ),
      );
      req.end();
    });
  }

  /** Lê o corpo, já descomprimido, e para se passar do limite (protege também de arquivos "zip bomb"). */
  private async readBody(
    response: IncomingMessage,
    limit: number,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        size += chunk.length;
        if (size > limit) {
          done(
            new PageFetchError(
              'too_large',
              'A página é grande demais para ser lida.',
            ),
          );
          return;
        }
        chunks.push(chunk);
        done();
      },
    });

    const encoding = String(
      response.headers['content-encoding'] ?? '',
    ).toLowerCase();
    const decoder =
      encoding === 'gzip' || encoding === 'x-gzip'
        ? createGunzip()
        : encoding === 'br'
          ? createBrotliDecompress()
          : encoding === 'deflate'
            ? createInflate()
            : null;

    try {
      if (decoder) {
        await pipeline(response, decoder, counter);
      } else {
        await pipeline(response, counter);
      }
    } catch (error) {
      if (error instanceof PageFetchError) {
        throw error;
      }
      throw this.failed('a resposta do site veio incompleta');
    }
    return Buffer.concat(chunks);
  }
}

/** Resolve o nome do site e recusa a conexão se algum endereço for interno. */
function guardedLookup(allowPrivate: boolean): LookupFunction {
  return (hostname, options, callback) => {
    dns.lookup(hostname, options, (error, address, family) => {
      if (error) {
        callback(error, address, family);
        return;
      }
      const list = Array.isArray(address)
        ? address.map((entry) => entry.address)
        : [address];
      if (!allowPrivate && list.some((entry) => !isPublicAddress(entry))) {
        callback(
          new PageFetchError(
            'unsafe_url',
            'Esse endereço não é público.',
          ) as unknown as NodeJS.ErrnoException,
          '',
          0,
        );
        return;
      }
      callback(null, address, family);
    });
  };
}
