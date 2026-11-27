import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Seguir e feed (e2e)', () => {
  let app: NestExpressApplication;
  let ana: Session;
  let bia: Session;
  let cris: Session;
  const server = () => app.getHttpServer();
  const follow = (session: Session | null, username: string) => {
    const req = request(server()).put(`${API}/users/${username}/follow`);
    return session ? req.set(session.auth) : req;
  };
  const feed = (session: Session, query = '') =>
    request(server()).get(`${API}/feed${query}`).set(session.auth);

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    ana = await createSession(app);
    bia = await createSession(app);
    cris = await createSession(app);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('seguir exige login, não vale para si mesmo nem para quem não existe', async () => {
    await follow(null, bia.username).expect(401);
    const self = await follow(ana, ana.username).expect(400);
    expect(self.body.code).toBe('cannot_follow_self');
    const missing = await follow(ana, 'nao_existe_e2e').expect(404);
    expect(missing.body.code).toBe('user_not_found');
  });

  it('segue, confere, repete sem duplicar, mostra os números e as listas, e deixa de seguir', async () => {
    const state = () =>
      request(server()).get(`${API}/users/${bia.username}/follow`).set(ana.auth);
    expect((await state().expect(200)).body).toEqual({ following: false });

    expect((await follow(ana, bia.username).expect(200)).body).toEqual({ following: true });
    await follow(ana, bia.username).expect(200);
    expect((await state().expect(200)).body).toEqual({ following: true });

    const counts = await request(server()).get(`${API}/users/${bia.username}/follows`).expect(200);
    expect(counts.body).toEqual({ followers: 1, following: 0 });
    const followers = await request(server()).get(`${API}/users/${bia.username}/followers`).expect(200);
    expect(followers.body.map((user: { username: string }) => user.username)).toEqual([ana.username]);
    expect(followers.body[0]).not.toHaveProperty('email');
    const following = await request(server()).get(`${API}/users/${ana.username}/following`).expect(200);
    expect(following.body.map((user: { username: string }) => user.username)).toEqual([bia.username]);

    await request(server()).delete(`${API}/users/${bia.username}/follow`).set(ana.auth).expect(204);
    await request(server()).delete(`${API}/users/${bia.username}/follow`).set(ana.auth).expect(204);
    expect((await state().expect(200)).body).toEqual({ following: false });
    const after = await request(server()).get(`${API}/users/${bia.username}/follows`).expect(200);
    expect(after.body).toEqual({ followers: 0, following: 0 });
  });

  it('o feed exige login e, sem seguir ninguém, vem vazio e diz isso', async () => {
    await request(server()).get(`${API}/feed`).expect(401);
    const response = await feed(cris).expect(200);
    expect(response.body).toEqual({ items: [], next: null, following: 0 });
  });

  it('o feed mostra a atividade de quem a pessoa segue, do mais novo ao mais antigo, e anda por data', async () => {
    const prisma = app.get(PrismaService);
    const artist = await prisma.artist.create({
      data: { name: 'E2E Banda do Feed', slug: 'e2e-banda-do-feed' },
    });
    const release = await prisma.release.create({
      data: {
        title: 'E2E Disco do Feed',
        slug: 'e2e-disco-do-feed',
        type: 'ALBUM',
        releaseDate: new Date('2020-01-01'),
        artists: { create: [{ artistId: artist.id, role: 'PRIMARY', position: 0 }] },
      },
    });
    await prisma.review.create({
      data: { userId: bia.id, releaseId: release.id, rating: 9, body: 'Disco muito bom.', createdAt: new Date('2026-01-01T10:00:00Z') },
    });
    await prisma.artistFavorite.create({
      data: { userId: bia.id, artistId: artist.id, createdAt: new Date('2026-01-02T10:00:00Z') },
    });
    // Atividade de quem a Ana não segue não aparece.
    await prisma.artistFavorite.create({
      data: { userId: cris.id, artistId: artist.id, createdAt: new Date('2026-01-03T10:00:00Z') },
    });
    await follow(ana, bia.username).expect(200);

    const page = await feed(ana).expect(200);
    expect(page.body.following).toBe(1);
    expect(page.body.items.map((item: { type: string }) => item.type)).toEqual(['favorite', 'review']);
    expect(page.body.items[0]).toMatchObject({ user: { username: bia.username }, artist: { slug: 'e2e-banda-do-feed' } });
    expect(page.body.items[1]).toMatchObject({ rating: 9, excerpt: 'Disco muito bom.', release: { slug: 'e2e-disco-do-feed', artists: ['E2E Banda do Feed'] } });
    expect(page.body.next).toBeNull();

    // Uma por vez: a segunda página começa antes da primeira.
    const first = await feed(ana, '?limit=1').expect(200);
    expect(first.body.items).toHaveLength(1);
    expect(first.body.items[0].type).toBe('favorite');
    expect(first.body.next).toBe('2026-01-02T10:00:00.000Z');
    const second = await feed(ana, `?limit=1&before=${encodeURIComponent(first.body.next)}`).expect(200);
    expect(second.body.items.map((item: { type: string }) => item.type)).toEqual(['review']);
    expect(second.body.next).toBeNull();

    await feed(ana, '?before=ontem').expect(400);
    await feed(ana, '?limit=500').expect(400);
  });

  it('o "eu vou" só entra no feed de quem escolheu mostrar o nome', async () => {
    const prisma = app.get(PrismaService);
    const make = (slug: string) =>
      prisma.show.create({
        data: { slug, date: new Date('2030-01-01'), venue: 'Casa', city: 'São Paulo', state: 'SP', acts: { create: [{ position: 0, name: 'E2E Atração' }] } },
      });
    const visible = await make('e2e-show-feed-a');
    const hidden = await make('e2e-show-feed-b');
    await prisma.showAttendance.create({ data: { userId: bia.id, showId: visible.id, showName: true, createdAt: new Date('2026-02-01T10:00:00Z') } });
    await prisma.showAttendance.create({ data: { userId: bia.id, showId: hidden.id, showName: false, createdAt: new Date('2026-02-02T10:00:00Z') } });

    const response = await feed(ana).expect(200);
    const shows = response.body.items.filter((item: { type: string }) => item.type === 'attendance');
    expect(shows).toHaveLength(1);
    expect(shows[0].show).toMatchObject({ slug: 'e2e-show-feed-a', title: 'E2E Atração', city: 'São Paulo' });
  });

  it('apagar a conta de quem segue ou de quem é seguido desfaz o vínculo', async () => {
    const prisma = app.get(PrismaService);
    expect(await prisma.follow.count({ where: { followerId: ana.id } })).toBe(1);
    await prisma.user.delete({ where: { id: bia.id } });
    expect(await prisma.follow.count({ where: { followerId: ana.id } })).toBe(0);
  });
});
