import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Grupos dos shows (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let moderator: Session;
  let ana: Session;
  let bia: Session;
  let unverified: Session;
  const server = () => app.getHttpServer();
  const wa = (code: string) => `https://chat.whatsapp.com/${code}`;
  const suggest = (slug: string, session: Session | null, url: string) => {
    const req = request(server()).post(`${API}/shows/${slug}/groups`);
    return (session ? req.set(session.auth) : req).send({ url });
  };
  const publicList = async (slug = 'e2e-grupos') =>
    (await request(server()).get(`${API}/shows/${slug}/groups`).expect(200))
      .body as Array<{ id: string; platform: string; url: string }>;
  const review = async (status = 'PENDING') =>
    (
      await request(server())
        .get(`${API}/groups/review?status=${status}`)
        .set(moderator.auth)
        .expect(200)
    ).body as Array<{ id: string; url: string; suggestedBy: { username: string } | null }>;
  const createShow = (slug: string, overrides: object = {}) =>
    request(server())
      .post(`${API}/shows`)
      .set(admin.auth)
      .send({
        slug,
        date: daysFromNow(30),
        venue: 'Espaço de Teste',
        city: 'São Paulo',
        state: 'SP',
        acts: [{ name: 'E2E Banda Visitante' }],
        ...overrides,
      })
      .expect(201);

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    moderator = await createSession(app, { moderator: true });
    ana = await createSession(app);
    bia = await createSession(app);
    unverified = await createSession(app, { unverified: true });
    await createShow('e2e-grupos');
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('a lista é pública e começa vazia; show inexistente dá 404', async () => {
    expect(await publicList()).toEqual([]);
    await request(server()).get(`${API}/shows/e2e-nada/groups`).expect(404);
  });

  it('exige login e e-mail confirmado', async () => {
    await suggest('e2e-grupos', null, wa('AbCdEf123')).expect(401);
    const response = await suggest('e2e-grupos', unverified, wa('AbCdEf123')).expect(403);
    expect(response.body.code).toBe('email_not_verified');
  });

  it('só aceita convite de WhatsApp, Telegram ou Discord', async () => {
    for (const url of [
      'https://instagram.com/emotourbrasil',
      'http://chat.whatsapp.com/AbCdEf123',
      'https://chat.whatsapp.com.golpe.example/AbCdEf123',
      'não é link',
    ]) {
      const response = await suggest('e2e-grupos', ana, url).expect(400);
      expect(response.body.code).toBe('invalid_group_link');
      expect(response.body.details[0].field).toBe('url');
    }
  });

  it('a sugestão fica pendente: não aparece na lista pública e entra na fila', async () => {
    const created = await suggest('e2e-grupos', ana, `${wa('AnaGrupo01')}?mode=r_c`).expect(201);
    expect(created.body).toMatchObject({
      platform: 'WHATSAPP',
      url: wa('AnaGrupo01'),
      status: 'PENDING',
    });
    expect(await publicList()).toEqual([]);
    expect((await review()).find((item) => item.url === wa('AnaGrupo01'))?.suggestedBy?.username).toBe(
      ana.username,
    );
    expect((await suggest('e2e-grupos', bia, wa('AnaGrupo01')).expect(409)).body.code).toBe(
      'group_already_suggested',
    );
  });

  it('só moderação vê a fila e decide', async () => {
    const id = (await review()).find((item) => item.url === wa('AnaGrupo01'))!.id;
    await request(server()).get(`${API}/groups/review`).expect(401);
    await request(server()).get(`${API}/groups/review`).set(ana.auth).expect(403);
    await request(server()).patch(`${API}/groups/${id}`).set(ana.auth).send({ status: 'APPROVED' }).expect(403);

    await request(server()).patch(`${API}/groups/${id}`).set(moderator.auth).send({ status: 'APPROVED' }).expect(204);
    expect((await publicList()).map((item) => item.url)).toEqual([wa('AnaGrupo01')]);
    expect((await review()).some((item) => item.id === id)).toBe(false);

    await request(server()).delete(`${API}/groups/${id}`).set(ana.auth).expect(403);
    await request(server()).delete(`${API}/groups/${id}`).set(moderator.auth).expect(204);
    await request(server()).delete(`${API}/groups/${id}`).set(moderator.auth).expect(404);
    expect(await publicList()).toEqual([]);
  });

  it('a sugestão de moderador já entra aprovada', async () => {
    const created = await suggest('e2e-grupos', moderator, 'https://discord.gg/modGrupo').expect(201);
    expect(created.body.status).toBe('APPROVED');
    expect((await publicList()).map((item) => item.platform)).toEqual(['DISCORD']);
  });

  it('limita a 3 sugestões por dia para quem não é da moderação', async () => {
    for (const code of ['LimiteUm01', 'LimiteDois02', 'LimiteTres03']) {
      await suggest('e2e-grupos', bia, wa(code)).expect(201);
    }
    const response = await suggest('e2e-grupos', bia, wa('LimiteQuatro04')).expect(429);
    expect(response.body.code).toBe('group_limit_reached');
  });

  it('recusa show cancelado e show que já passou', async () => {
    await createShow('e2e-grupos-cancelado', { status: 'CANCELLED' });
    await createShow('e2e-grupos-passado', { date: daysFromNow(-3) });
    expect((await suggest('e2e-grupos-cancelado', moderator, wa('CancelAbc1')).expect(400)).body.code).toBe(
      'show_cancelled',
    );
    expect((await suggest('e2e-grupos-passado', moderator, wa('PassadoAb1')).expect(400)).body.code).toBe(
      'show_past',
    );
  });
});
