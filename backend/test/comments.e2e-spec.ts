import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';
const SLUG = 'e2e-mural';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Mural dos shows (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let moderator: Session;
  let ana: Session;
  let bia: Session;
  let unverified: Session;
  const server = () => app.getHttpServer();
  const board = `${API}/shows/${SLUG}/comments`;

  const comment = (session: Session | null, body: unknown) => {
    const req = request(server()).post(board);
    return (session ? req.set(session.auth) : req).send({ body });
  };
  const list = async () =>
    (await request(server()).get(board).expect(200)).body as Array<{
      id: string;
      body: string;
      author: { username: string };
    }>;
  const report = (id: string, session: Session | null, reason?: string) => {
    const req = request(server()).post(`${API}/comments/${id}/reports`);
    return (session ? req.set(session.auth) : req).send({ reason });
  };
  const queue = async () =>
    (
      await request(server())
        .get(`${API}/comments/reported`)
        .set(moderator.auth)
        .expect(200)
    ).body as Array<{ id: string; reportCount: number; reasons: string[] }>;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    moderator = await createSession(app, { moderator: true });
    ana = await createSession(app);
    bia = await createSession(app);
    unverified = await createSession(app, { unverified: true });
    await request(server())
      .post(`${API}/shows`)
      .set(admin.auth)
      .send({
        slug: SLUG,
        date: daysFromNow(30),
        venue: 'Espaço de Teste',
        city: 'São Paulo',
        state: 'SP',
        acts: [{ name: 'E2E Banda Visitante' }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('o mural é público; show inexistente dá 404', async () => {
    expect(await list()).toEqual([]);
    await request(server()).get(`${API}/shows/e2e-nada/comments`).expect(404);
  });

  it('exige login e e-mail confirmado para comentar', async () => {
    await comment(null, 'oi').expect(401);
    const response = await comment(unverified, 'oi').expect(403);
    expect(response.body.code).toBe('email_not_verified');
  });

  it('valida o texto: vazio, longo demais e links', async () => {
    await comment(ana, '   ').expect(400);
    await comment(ana, 'a'.repeat(501)).expect(400);
    for (const text of [
      'veja https://golpe.exemplo/x',
      'entra em www.exemplo.com.br',
      'chama no grupo.com/abc',
    ]) {
      await comment(ana, text).expect(400);
    }
    await comment(ana, 'Quem vai de ônibus? Saio de Campinas.').expect(201);
  });

  it('publica, lista do mais novo para o mais antigo e mostra só dados públicos', async () => {
    await comment(bia, 'Vou chegar cedo!').expect(201);
    const items = await list();
    expect(items.map((item) => item.body)).toEqual([
      'Vou chegar cedo!',
      'Quem vai de ônibus? Saio de Campinas.',
    ]);
    expect(JSON.stringify(items)).not.toContain('@');
    expect(items[0]?.author.username).toBe(bia.username);
  });

  it('só quem escreveu ou um moderador apaga', async () => {
    const [biaPost, anaPost] = await list();
    await request(server())
      .delete(`${API}/comments/${anaPost!.id}`)
      .set(bia.auth)
      .expect(403);
    await request(server())
      .delete(`${API}/comments/${biaPost!.id}`)
      .set(bia.auth)
      .expect(204);
    await request(server())
      .delete(`${API}/comments/${anaPost!.id}`)
      .set(moderator.auth)
      .expect(204);
    await request(server())
      .delete(`${API}/comments/${anaPost!.id}`)
      .set(moderator.auth)
      .expect(404);
    expect(await list()).toEqual([]);
  });

  describe('denúncias', () => {
    let id: string;
    beforeAll(async () => {
      id = (await comment(ana, 'Comentário polêmico').expect(201)).body.id;
    });

    it('exige login e e-mail confirmado, e não deixa denunciar o próprio', async () => {
      await report(id, null).expect(401);
      await report(id, unverified).expect(403);
      expect((await report(id, ana).expect(400)).body.code).toBe('own_comment');
      await request(server())
        .post(`${API}/comments/00000000-0000-7000-8000-000000000000/reports`)
        .set(bia.auth)
        .send({})
        .expect(404);
    });

    it('conta uma denúncia por pessoa e mostra na fila só para a moderação', async () => {
      await report(id, bia, 'Ofensivo').expect(204);
      expect((await report(id, bia).expect(409)).body.code).toBe(
        'already_reported',
      );
      await report(id, moderator).expect(204);

      await request(server()).get(`${API}/comments/reported`).expect(401);
      await request(server())
        .get(`${API}/comments/reported`)
        .set(bia.auth)
        .expect(403);

      const entry = (await queue()).find((item) => item.id === id);
      expect(entry?.reportCount).toBe(2);
      expect(entry?.reasons).toEqual(['Ofensivo']);
    });

    it('"manter" tira da fila sem apagar; nova denúncia de outra pessoa reabre', async () => {
      await request(server())
        .delete(`${API}/comments/${id}/reports`)
        .set(bia.auth)
        .expect(403);
      await request(server())
        .delete(`${API}/comments/${id}/reports`)
        .set(moderator.auth)
        .expect(204);
      expect((await queue()).some((item) => item.id === id)).toBe(false);
      expect((await list()).some((item) => item.id === id)).toBe(true);

      await report(id, admin).expect(204);
      expect((await queue()).find((item) => item.id === id)?.reportCount).toBe(
        1,
      );
    });

    it('apagar o comentário o tira da fila', async () => {
      await request(server())
        .delete(`${API}/comments/${id}`)
        .set(moderator.auth)
        .expect(204);
      expect((await queue()).some((item) => item.id === id)).toBe(false);
    });
  });
});
