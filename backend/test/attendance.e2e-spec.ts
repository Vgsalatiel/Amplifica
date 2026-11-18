import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

function daysFromNow(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Eu vou (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let ana: Session;
  let bia: Session;
  let unverified: Session;
  const server = () => app.getHttpServer();
  const url = (slug: string, tail = '') =>
    `${API}/shows/${slug}/attendance${tail}`;

  const createShow = (slug: string, overrides: object = {}) =>
    request(server())
      .post(`${API}/shows`)
      .set(admin.auth)
      .send({
        slug: `e2e-${slug}`,
        date: daysFromNow(30),
        venue: 'Espaço de Teste',
        city: 'São Paulo',
        state: 'SP',
        acts: [{ name: 'E2E Banda Visitante' }],
        ...overrides,
      })
      .expect(201);
  const go = (slug: string, session: Session | null, body: object = {}) => {
    const req = request(server()).put(url(slug, '/me'));
    return (session ? req.set(session.auth) : req).send(body);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    ana = await createSession(app);
    bia = await createSession(app);
    unverified = await createSession(app, { unverified: true });
    await createShow('eu-vou');
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('a lista é pública e começa vazia; show inexistente dá 404', async () => {
    const response = await request(server())
      .get(url('e2e-eu-vou'))
      .expect(200);
    expect(response.body).toEqual({ count: 0, going: [] });
    const missing = await request(server()).get(url('e2e-nao-existe')).expect(404);
    expect(missing.body.code).toBe('show_not_found');
  });

  it('exige login e e-mail confirmado para marcar presença', async () => {
    await go('e2e-eu-vou', null).expect(401);
    const response = await go('e2e-eu-vou', unverified).expect(403);
    expect(response.body.code).toBe('email_not_verified');
    await request(server()).get(url('e2e-eu-vou', '/me')).expect(401);
  });

  it('conta todo mundo, mas só mostra o nome de quem pediu', async () => {
    await go('e2e-eu-vou', ana).expect(200, { going: true, showName: false });
    await go('e2e-eu-vou', bia, { showName: true }).expect(200, {
      going: true,
      showName: true,
    });

    const list = (
      await request(server()).get(url('e2e-eu-vou')).expect(200)
    ).body;
    expect(list.count).toBe(2);
    expect(list.going).toHaveLength(1);
    expect(list.going[0].username).toBe(bia.username);
    expect(JSON.stringify(list)).not.toContain(ana.username);
    expect(list.going[0]).not.toHaveProperty('email');
  });

  it('marcar de novo só troca a escolha do nome, sem duplicar', async () => {
    await go('e2e-eu-vou', ana, { showName: true }).expect(200);
    await go('e2e-eu-vou', ana, { showName: true }).expect(200);
    const list = (await request(server()).get(url('e2e-eu-vou')).expect(200))
      .body;
    expect(list.count).toBe(2);
    expect(list.going).toHaveLength(2);

    await go('e2e-eu-vou', ana, { showName: false }).expect(200);
    const after = (await request(server()).get(url('e2e-eu-vou')).expect(200))
      .body;
    expect(after.going).toHaveLength(1);
  });

  it('cada pessoa vê a própria situação e pode desmarcar (sem erro se repetir)', async () => {
    const me = (path: string, session: Session) =>
      request(server()).get(url(path, '/me')).set(session.auth);
    await me('e2e-eu-vou', bia).expect(200, { going: true, showName: true });

    await request(server())
      .delete(url('e2e-eu-vou', '/me'))
      .set(bia.auth)
      .expect(204);
    await request(server())
      .delete(url('e2e-eu-vou', '/me'))
      .set(bia.auth)
      .expect(204);
    await me('e2e-eu-vou', bia).expect(200, { going: false, showName: false });
    expect(
      (await request(server()).get(url('e2e-eu-vou')).expect(200)).body.count,
    ).toBe(1);
  });

  it('recusa corpo inválido', async () => {
    await go('e2e-eu-vou', ana, { showName: 'sim' }).expect(400);
  });

  it('não aceita presença em show cancelado nem em show que já passou', async () => {
    await createShow('cancelado', { status: 'CANCELLED' });
    await createShow('passado', { date: daysFromNow(-3) });
    expect((await go('e2e-cancelado', ana).expect(400)).body.code).toBe(
      'show_cancelled',
    );
    expect((await go('e2e-passado', ana).expect(400)).body.code).toBe(
      'show_past',
    );
  });

  it('a presença some junto com o show', async () => {
    const show = (await createShow('apagavel')).body;
    await go('e2e-apagavel', ana).expect(200);
    await request(server())
      .delete(`${API}/shows/${show.id}`)
      .set(admin.auth)
      .expect(204);
    await request(server()).get(url('e2e-apagavel')).expect(404);
  });
});
