import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';
type Session = Awaited<ReturnType<typeof createSession>>;

describe('Moderação e equipe (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Session;
  let moderator: Session;
  let member: Session;
  const server = () => app.getHttpServer();

  const pendingClip = (youtubeId: string, title: string) =>
    prisma.clip.create({
      data: {
        youtubeId,
        title: `E2E ${title}`,
        channelName: 'E2E Canal',
        status: 'PENDING',
      },
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    moderator = await createSession(app, { moderator: true });
    member = await createSession(app);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('o que o moderador pode (clipes da comunidade)', () => {
    it('vê a fila, aprova, recusa e remove clipes', async () => {
      const a = await pendingClip('MODAAAAAAA1', 'Mod A');
      const b = await pendingClip('MODAAAAAAA2', 'Mod B');
      const c = await pendingClip('MODAAAAAAA3', 'Mod C');

      const queue = await request(server())
        .get(`${API}/clips/review`)
        .set(moderator.auth)
        .expect(200);
      expect(queue.body.map((clip: { id: string }) => clip.id)).toEqual(
        expect.arrayContaining([a.id, b.id, c.id]),
      );

      const approved = await request(server())
        .patch(`${API}/clips/${a.id}`)
        .set(moderator.auth)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approved.body.status).toBe('APPROVED');
      await request(server())
        .patch(`${API}/clips/${b.id}`)
        .set(moderator.auth)
        .send({ status: 'REJECTED' })
        .expect(200);
      await request(server())
        .delete(`${API}/clips/${c.id}`)
        .set(moderator.auth)
        .expect(204);
    });

    it('usuário comum não modera', async () => {
      const clip = await pendingClip('MODAAAAAAA4', 'Mod D');
      await request(server())
        .get(`${API}/clips/review`)
        .set(member.auth)
        .expect(403);
      await request(server())
        .patch(`${API}/clips/${clip.id}`)
        .set(member.auth)
        .send({ status: 'APPROVED' })
        .expect(403);
      await request(server())
        .delete(`${API}/clips/${clip.id}`)
        .set(member.auth)
        .expect(403);
    });

    it('o moderador não mexe no catálogo nem na agenda', async () => {
      await request(server())
        .post(`${API}/artists`)
        .set(moderator.auth)
        .send({ name: 'E2E Banda do Moderador' })
        .expect(403);
      await request(server())
        .post(`${API}/shows`)
        .set(moderator.auth)
        .send({})
        .expect(403);
      await request(server())
        .post(`${API}/genres`)
        .set(moderator.auth)
        .send({ name: 'E2E Gênero do Moderador' })
        .expect(403);
    });

    it('o administrador continua moderando', async () => {
      await request(server())
        .get(`${API}/clips/review`)
        .set(admin.auth)
        .expect(200);
    });
  });

  describe('equipe: só administradores', () => {
    it('lista administradores primeiro e depois moderadores', async () => {
      const response = await request(server())
        .get(`${API}/team`)
        .set(admin.auth)
        .expect(200);

      const roles: string[] = response.body.map(
        (m: { role: string }) => m.role,
      );
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('MODERATOR');
      expect(roles.indexOf('MODERATOR')).toBeGreaterThan(
        roles.lastIndexOf('ADMIN'),
      );
      expect(response.body).toContainEqual({
        username: moderator.username,
        displayName: expect.any(String),
        role: 'MODERATOR',
      });
    });

    it('moderador e usuário comum não veem nem alteram a equipe', async () => {
      for (const session of [moderator, member]) {
        await request(server())
          .get(`${API}/team`)
          .set(session.auth)
          .expect(403);
        await request(server())
          .put(`${API}/team/${member.username}`)
          .set(session.auth)
          .send({ role: 'MODERATOR' })
          .expect(403);
      }
      await request(server()).get(`${API}/team`).expect(401);
    });

    it('promove pelo @usuário, em qualquer caixa, e o novo moderador já pode moderar', async () => {
      const newcomer = await createSession(app);
      await request(server())
        .get(`${API}/clips/review`)
        .set(newcomer.auth)
        .expect(403);

      const promoted = await request(server())
        .put(`${API}/team/@${newcomer.username.toUpperCase()}`)
        .set(admin.auth)
        .send({ role: 'MODERATOR' })
        .expect(200);
      expect(promoted.body).toMatchObject({
        username: newcomer.username,
        role: 'MODERATOR',
      });

      // O papel é lido do banco a cada requisição: vale na hora, sem sair e entrar de novo.
      await request(server())
        .get(`${API}/clips/review`)
        .set(newcomer.auth)
        .expect(200);

      const demoted = await request(server())
        .put(`${API}/team/${newcomer.username}`)
        .set(admin.auth)
        .send({ role: 'USER' })
        .expect(200);
      expect(demoted.body.role).toBe('USER');
      await request(server())
        .get(`${API}/clips/review`)
        .set(newcomer.auth)
        .expect(403);
    });

    it('recusa conta que não existe, administrador, papel inválido e e-mail não confirmado', async () => {
      const missing = await request(server())
        .put(`${API}/team/e2e-ninguem-assim`)
        .set(admin.auth)
        .send({ role: 'MODERATOR' })
        .expect(404);
      expect(missing.body.code).toBe('user_not_found');

      const locked = await request(server())
        .put(`${API}/team/${admin.username}`)
        .set(admin.auth)
        .send({ role: 'USER' })
        .expect(403);
      expect(locked.body.code).toBe('admin_role_locked');

      await request(server())
        .put(`${API}/team/${member.username}`)
        .set(admin.auth)
        .send({ role: 'ADMIN' })
        .expect(400);
      await request(server())
        .put(`${API}/team/${member.username}`)
        .set(admin.auth)
        .send({})
        .expect(400);

      const unverified = await createSession(app, { unverified: true });
      const blocked = await request(server())
        .put(`${API}/team/${unverified.username}`)
        .set(admin.auth)
        .send({ role: 'MODERATOR' })
        .expect(409);
      expect(blocked.body.code).toBe('email_not_verified');
    });
  });
});
