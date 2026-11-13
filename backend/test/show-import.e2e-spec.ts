import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import {
  PageFetcher,
  PageFetchError,
} from '../src/modules/shows/import/page-fetcher.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

type Session = Awaited<ReturnType<typeof createSession>>;

const jsonLd = (event: object) =>
  `<html><head><title>Página</title><script type="application/ld+json">${JSON.stringify(event)}</script></head></html>`;

const event = {
  '@context': 'https://schema.org',
  '@type': 'MusicEvent',
  name: 'E2E Banda Lida',
  url: 'https://ingressos.exemplo.test/evento/1',
  startDate: '2028-05-10T21:00:00-03:00',
  location: {
    '@type': 'Place',
    name: 'Espaço Importado',
    address: {
      addressLocality: 'Goiânia',
      addressRegion: 'GO',
      addressCountry: 'BR',
    },
  },
  performer: [{ name: 'E2E Banda Lida' }, { name: 'E2E Banda Desconhecida' }],
  offers: { availability: 'https://schema.org/InStock' },
};

/** Páginas falsas por endereço; erros definidos aqui viram PageFetchError, como na leitura de verdade. */
const pages: Record<string, string | PageFetchError> = {
  'https://ingressos.exemplo.test/evento/1': jsonLd(event),
  'https://ingressos.exemplo.test/sem-dados':
    '<html><head><title>Só um título</title></head></html>',
  'https://ingressos.exemplo.test/cancelado': jsonLd({
    ...event,
    eventStatus: 'https://schema.org/EventCancelled',
  }),
  'https://interno.exemplo.test/': new PageFetchError(
    'unsafe_url',
    'Esse endereço não é público.',
  ),
  'https://fechado.exemplo.test/': new PageFetchError(
    'blocked_by_robots',
    'O site pede que não leiam.',
  ),
  'https://fora-do-ar.exemplo.test/': new PageFetchError(
    'fetch_failed',
    'Não foi possível ler a página: o site respondeu 500.',
  ),
};
const fakeFetcher = {
  fetchHtml: (url: string) => {
    const page = pages[url];
    if (page === undefined) {
      return Promise.reject(
        new PageFetchError(
          'fetch_failed',
          'Não foi possível ler a página: o site respondeu 404.',
        ),
      );
    }
    return page instanceof PageFetchError
      ? Promise.reject(page)
      : Promise.resolve({ url, html: page });
  },
};

describe('Importar show de um link (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let user: Session;
  const server = () => app.getHttpServer();
  const preview = (session: Session | null, url: unknown) => {
    const req = request(server()).post(`${API}/shows/import-preview`);
    return (session ? req.set(session.auth) : req).send({ url });
  };

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(PageFetcher).useValue(fakeFetcher),
    );
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    user = await createSession(app);

    await request(server())
      .post(`${API}/artists`)
      .set(admin.auth)
      .send({ name: 'E2E Banda Lida', slug: 'e2e-banda-lida' })
      .expect(201);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('só administradores usam a importação', async () => {
    await preview(null, 'https://ingressos.exemplo.test/evento/1').expect(401);
    await preview(user, 'https://ingressos.exemplo.test/evento/1').expect(403);
  });

  it('devolve a sugestão de show, liga a banda ao catálogo e não grava nada', async () => {
    const before = await request(server()).get(
      `${API}/shows?when=all&limit=50`,
    );
    const { body } = await preview(
      admin,
      'https://ingressos.exemplo.test/evento/1',
    ).expect(200);

    expect(body).toMatchObject({
      source: 'ingressos.exemplo.test',
      structured: true,
      date: '2028-05-10',
      startTime: '21:00',
      venue: 'Espaço Importado',
      city: 'Goiânia',
      state: 'GO',
      status: 'CONFIRMED',
      ticketUrl: 'https://ingressos.exemplo.test/evento/1',
      existingShowSlug: null,
    });
    expect(body.acts).toEqual([
      { name: 'E2E Banda Lida', artistId: expect.any(String) },
      { name: 'E2E Banda Desconhecida', artistId: null },
    ]);
    // O nome do evento é igual ao de uma banda só quando há uma banda: com duas, ele fica.
    expect(body.name).toBe('E2E Banda Lida');

    const after = await request(server()).get(`${API}/shows?when=all&limit=50`);
    expect(after.body.meta.total).toBe(before.body.meta.total);
  });

  it('tira o nome do evento quando ele só repete o nome da única banda', async () => {
    pages['https://ingressos.exemplo.test/uma-banda'] = jsonLd({
      ...event,
      performer: [{ name: 'e2e banda lida' }],
    });
    const { body } = await preview(
      admin,
      'https://ingressos.exemplo.test/uma-banda',
    ).expect(200);
    expect(body.name).toBeNull();
    expect(body.acts).toEqual([
      { name: 'e2e banda lida', artistId: expect.any(String) },
    ]);
  });

  it('avisa quando o show já está cadastrado', async () => {
    const created = (
      await request(server())
        .post(`${API}/shows`)
        .set(admin.auth)
        .send({
          slug: 'e2e-show-ja-cadastrado',
          date: '2028-05-10',
          venue: 'ESPAÇO IMPORTADO',
          city: 'goiânia',
          state: 'GO',
          acts: [{ name: 'e2e banda lida' }],
        })
        .expect(201)
    ).body;

    const { body } = await preview(
      admin,
      'https://ingressos.exemplo.test/evento/1',
    ).expect(200);
    expect(body.existingShowSlug).toBe(created.slug);
  });

  it('lê a situação "cancelado"', async () => {
    const { body } = await preview(
      admin,
      'https://ingressos.exemplo.test/cancelado',
    ).expect(200);
    expect(body.status).toBe('CANCELLED');
  });

  it('página sem dados do evento devolve só o título, com aviso', async () => {
    const { body } = await preview(
      admin,
      'https://ingressos.exemplo.test/sem-dados',
    ).expect(200);
    expect(body).toMatchObject({
      structured: false,
      name: 'Só um título',
      date: null,
      acts: [],
    });
    expect(body.warnings.join(' ')).toMatch(/à mão/);
  });

  it('traduz as falhas de leitura em respostas claras', async () => {
    const unsafe = await preview(admin, 'https://interno.exemplo.test/').expect(
      400,
    );
    expect(unsafe.body.code).toBe('import_unsafe_url');

    const blocked = await preview(
      admin,
      'https://fechado.exemplo.test/',
    ).expect(422);
    expect(blocked.body.code).toBe('import_blocked_by_robots');

    const down = await preview(
      admin,
      'https://fora-do-ar.exemplo.test/',
    ).expect(502);
    expect(down.body.code).toBe('import_fetch_failed');
    expect(down.body.message).toMatch(/500/);
  });

  it('recusa link que não é http/https ou que está vazio', async () => {
    for (const url of [
      '',
      'ftp://exemplo.com/a',
      'javascript:alert(1)',
      'sem esquema.com',
      undefined,
    ]) {
      const { body } = await preview(admin, url).expect(400);
      expect(body.details[0].field).toBe('url');
    }
  });
});
