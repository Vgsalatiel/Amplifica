import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const SLUG = 'e2e-avaliados-disco-avaliado';
const url = (slug = SLUG) => `${API}/releases/${slug}/reviews`;

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Avaliações (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Session;
  let a: Session;
  let b: Session;
  let c: Session;
  let d: Session;
  let e: Session;
  const server = () => app.getHttpServer();

  const put = (session: Session, body: object, slug = SLUG) =>
    request(server())
      .put(`${url(slug)}/me`)
      .set(session.auth)
      .send(body);
  const releaseDetail = async (slug = SLUG) =>
    (await request(server()).get(`${API}/releases/${slug}`).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    [a, b, c, d, e] = await Promise.all([
      createSession(app),
      createSession(app),
      createSession(app),
      createSession(app),
      createSession(app),
    ]);

    const artist = await request(server())
      .post(`${API}/artists`)
      .set(admin.auth)
      .send({ name: 'E2E Avaliados' })
      .expect(201);
    const make = (title: string, releaseDate: string) =>
      request(server())
        .post(`${API}/releases`)
        .set(admin.auth)
        .send({
          title,
          type: 'ALBUM',
          releaseDate,
          artists: [{ artistId: artist.body.id }],
        })
        .expect(201);

    const year = new Date().getUTCFullYear();
    await make('Disco Avaliado', '2020-05-05');
    await make('Disco do Futuro', `${year + 1}-01-01`);
    await make('Ano Corrente', String(year));
    await make('Disco Cascata', '2019-01-01');
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('permissões', () => {
    it('o visitante lê a lista, vazia e sem login, mas não grava nem apaga', async () => {
      const list = await request(server()).get(url()).expect(200);
      expect(list.body).toMatchObject({ items: [], meta: { total: 0 } });

      await request(server())
        .put(`${url()}/me`)
        .send({ rating: 8 })
        .expect(401);
      await request(server()).get(`${url()}/me`).expect(401);
      await request(server()).delete(`${url()}/me`).expect(401);
      await request(server())
        .delete(`${API}/reviews/0193c1f0-0000-7000-8000-000000000000`)
        .expect(401);
    });
  });

  describe('criar e substituir', () => {
    it('avalia só com a nota: conta na média, mas não entra na lista de resenhas', async () => {
      const response = await put(a, { rating: 9 }).expect(200);

      expect(response.body).toMatchObject({
        rating: 9,
        body: null,
        edited: false,
      });
      expect((await request(server()).get(url())).body.meta.total).toBe(0);
      expect((await releaseDetail()).rating).toEqual({ average: 9, count: 1 });
    });

    it('avaliar de novo substitui, sem criar uma segunda avaliação', async () => {
      const response = await put(a, {
        rating: 8,
        body: '  Disco ótimo.  ',
      }).expect(200);

      expect(response.body).toMatchObject({ rating: 8, body: 'Disco ótimo.' });
      expect((await releaseDetail()).rating).toEqual({ average: 8, count: 1 });
      expect(await prisma.review.count({ where: { userId: a.id } })).toBe(1);
    });

    it('enviar só a nota apaga o texto que havia (substituição completa)', async () => {
      await put(e, { rating: 5, body: 'Texto' }).expect(200);

      const response = await put(e, { rating: 6 }).expect(200);

      expect(response.body.body).toBeNull();
      await prisma.review.deleteMany({ where: { userId: e.id } });
    });

    it('texto só com espaços vale como sem texto', async () => {
      const response = await put(d, { rating: 6, body: '     ' }).expect(200);

      expect(response.body.body).toBeNull();
    });

    it('duas gravações ao mesmo tempo da mesma pessoa resultam em uma avaliação', async () => {
      const responses = await Promise.all([
        put(e, { rating: 4, body: 'Primeira' }),
        put(e, { rating: 5, body: 'Segunda' }),
      ]);

      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      expect(await prisma.review.count({ where: { userId: e.id } })).toBe(1);
      await prisma.review.deleteMany({ where: { userId: e.id } });
    });
  });

  describe('validação', () => {
    it.each([
      ['nota zero', { rating: 0 }, 'rating'],
      ['nota onze', { rating: 11 }, 'rating'],
      ['nota com casa decimal', { rating: 5.5 }, 'rating'],
      ['nota como texto', { rating: '8' }, 'rating'],
      ['nota ausente', { body: 'Sem nota' }, 'rating'],
      ['resenha longa demais', { rating: 8, body: 'x'.repeat(3001) }, 'body'],
    ])('recusa %s', async (_name, body, field) => {
      const response = await put(a, body).expect(400);

      expect(response.body.code).toBe('validation_error');
      expect(
        response.body.details.map((detail: { field: string }) => detail.field),
      ).toContain(field);
    });

    it('aceita as notas dos dois extremos e a resenha no limite', async () => {
      await put(e, { rating: 1, body: 'x'.repeat(3000) }).expect(200);
      await put(e, { rating: 10 }).expect(200);
      await prisma.review.deleteMany({ where: { userId: e.id } });
    });

    it('o banco também recusa nota fora de 1 a 10, mesmo gravando por fora da API', async () => {
      const release = await prisma.release.findUniqueOrThrow({
        where: { slug: SLUG },
      });

      await expect(
        prisma.review.create({
          data: { userId: e.id, releaseId: release.id, rating: 11 },
        }),
      ).rejects.toThrow();
    });

    it('não grava para disco que não existe', async () => {
      const response = await put(a, { rating: 8 }, 'e2e-nao-existe').expect(
        404,
      );

      expect(response.body.code).toBe('release_not_found');
    });
  });

  describe('média e lista', () => {
    beforeAll(async () => {
      // A (8, com texto) já existe e é a mais antiga; D (6) está sem texto.
      await sleep(15);
      await put(b, { rating: 9, body: 'Resenha de B' }).expect(200);
      await sleep(15);
      await put(c, { rating: 7, body: 'Resenha de C' }).expect(200);
    });

    it('a média e a contagem do disco consideram todas as notas, com ou sem texto', async () => {
      // 8 + 9 + 7 + 6 = 30, em 4 avaliações.
      expect((await releaseDetail()).rating).toEqual({
        average: 7.5,
        count: 4,
      });
    });

    it('a lista traz só as com texto, da mais recente para a mais antiga', async () => {
      const response = await request(server()).get(url()).expect(200);

      expect(response.body.meta.total).toBe(3);
      expect(
        response.body.items.map((item: { body: string }) => item.body),
      ).toEqual(['Resenha de C', 'Resenha de B', 'Disco ótimo.']);
    });

    it('mostra só o que é público do autor, nunca o e-mail', async () => {
      const response = await request(server()).get(url()).expect(200);

      expect(Object.keys(response.body.items[0].author).sort()).toEqual([
        'avatar',
        'displayName',
        'username',
      ]);
      expect(JSON.stringify(response.body)).not.toContain('@e2e');
    });

    it('pagina a lista', async () => {
      const first = await request(server()).get(`${url()}?limit=2`).expect(200);
      expect(
        first.body.items.map((item: { body: string }) => item.body),
      ).toEqual(['Resenha de C', 'Resenha de B']);
      expect(first.body.meta).toMatchObject({ total: 3, totalPages: 2 });

      const second = await request(server())
        .get(`${url()}?limit=2&page=2`)
        .expect(200);
      expect(
        second.body.items.map((item: { body: string }) => item.body),
      ).toEqual(['Disco ótimo.']);
    });

    it('recusa parâmetros de paginação inválidos', async () => {
      await request(server()).get(`${url()}?limit=500`).expect(400);
      await request(server()).get(`${url()}?page=0`).expect(400);
    });

    it('devolve a própria avaliação de quem está logado, e 404 para quem ainda não avaliou', async () => {
      const mine = await request(server())
        .get(`${url()}/me`)
        .set(b.auth)
        .expect(200);
      expect(mine.body).toMatchObject({ rating: 9, body: 'Resenha de B' });

      const none = await request(server())
        .get(`${url()}/me`)
        .set(e.auth)
        .expect(404);
      expect(none.body.code).toBe('review_not_found');
    });

    it('marca como editada só a avaliação alterada bem depois de criada', async () => {
      const review = await prisma.review.findFirstOrThrow({
        where: { userId: c.id },
      });
      await prisma.review.update({
        where: { id: review.id },
        data: { updatedAt: new Date(review.createdAt.getTime() + 5 * 60_000) },
      });

      const response = await request(server()).get(url()).expect(200);
      const edited = response.body.items.map(
        (item: { body: string; edited: boolean }) => [item.body, item.edited],
      );

      expect(edited).toEqual([
        ['Resenha de C', true],
        ['Resenha de B', false],
        ['Disco ótimo.', false],
      ]);
    });
  });

  describe('perfil', () => {
    it('lista todas as avaliações da pessoa, com e sem texto, trazendo o disco', async () => {
      const profile = await prisma.user.findUniqueOrThrow({
        where: { id: d.id },
      });

      const response = await request(server())
        .get(`${API}/users/${profile.username}/reviews`)
        .expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.items[0]).toMatchObject({
        rating: 6,
        body: null,
        release: {
          slug: SLUG,
          title: 'Disco Avaliado',
          artists: [{ slug: 'e2e-avaliados' }],
        },
      });
    });

    it('responde 404 para uma pessoa que não existe', async () => {
      const response = await request(server())
        .get(`${API}/users/ninguem_com_esse_nome/reviews`)
        .expect(404);

      expect(response.body.code).toBe('user_not_found');
    });
  });

  describe('disco ainda não lançado', () => {
    it('não recebe nota', async () => {
      const response = await put(
        a,
        { rating: 8 },
        'e2e-avaliados-disco-do-futuro',
      ).expect(400);

      expect(response.body.code).toBe('release_not_out');
    });

    it('um disco com só o ano corrente já pode ser avaliado', async () => {
      await put(a, { rating: 8 }, 'e2e-avaliados-ano-corrente').expect(200);
    });
  });

  describe('apagar', () => {
    it('só o autor ou um administrador apagam; uma terceira pessoa recebe 403', async () => {
      const reviewOfA = await prisma.review.findFirstOrThrow({
        where: { userId: a.id, release: { slug: SLUG } },
      });

      const denied = await request(server())
        .delete(`${API}/reviews/${reviewOfA.id}`)
        .set(b.auth)
        .expect(403);
      expect(denied.body.code).toBe('forbidden');
      expect(await prisma.review.count({ where: { id: reviewOfA.id } })).toBe(
        1,
      );

      await request(server())
        .delete(`${API}/reviews/${reviewOfA.id}`)
        .set(a.auth)
        .expect(204);
      expect(await prisma.review.count({ where: { id: reviewOfA.id } })).toBe(
        0,
      );
    });

    it('o administrador remove a de qualquer pessoa', async () => {
      const reviewOfC = await prisma.review.findFirstOrThrow({
        where: { userId: c.id },
      });

      await request(server())
        .delete(`${API}/reviews/${reviewOfC.id}`)
        .set(admin.auth)
        .expect(204);

      expect(await prisma.review.count({ where: { id: reviewOfC.id } })).toBe(
        0,
      );
    });

    it('a pessoa apaga a própria avaliação do disco; apagar de novo responde 404', async () => {
      await request(server()).delete(`${url()}/me`).set(b.auth).expect(204);
      await request(server()).get(`${url()}/me`).set(b.auth).expect(404);

      const again = await request(server())
        .delete(`${url()}/me`)
        .set(b.auth)
        .expect(404);
      expect(again.body.code).toBe('review_not_found');
    });

    it('a média acompanha: restou só a nota sem texto de D', async () => {
      expect((await releaseDetail()).rating).toEqual({ average: 6, count: 1 });
    });

    it('recusa identificador inválido e responde 404 para o que não existe', async () => {
      await request(server())
        .delete(`${API}/reviews/nao-e-uuid`)
        .set(a.auth)
        .expect(400);
      await request(server())
        .delete(`${API}/reviews/0193c1f0-0000-7000-8000-000000000000`)
        .set(a.auth)
        .expect(404);
    });

    it('apagar o disco leva as avaliações dele', async () => {
      await put(
        a,
        { rating: 7, body: 'Vai sumir' },
        'e2e-avaliados-disco-cascata',
      ).expect(200);
      const release = await prisma.release.findUniqueOrThrow({
        where: { slug: 'e2e-avaliados-disco-cascata' },
      });
      expect(
        await prisma.review.count({ where: { releaseId: release.id } }),
      ).toBe(1);

      await request(server())
        .delete(`${API}/releases/${release.id}`)
        .set(admin.auth)
        .expect(204);

      expect(
        await prisma.review.count({ where: { releaseId: release.id } }),
      ).toBe(0);
    });
  });
});
