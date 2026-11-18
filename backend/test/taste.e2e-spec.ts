import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';
type Session = Awaited<ReturnType<typeof createSession>>;

describe('Busca de perfis e gosto em comum (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let ana: Session;
  let bia: Session;
  let caio: Session;
  const server = () => app.getHttpServer();
  const compare = (session: Session | null, username: string) => {
    const req = request(server()).get(`${API}/users/${username}/compatibility`);
    return session ? req.set(session.auth) : req;
  };

  /** Um disco de uma banda de teste, e as notas de cada pessoa. */
  async function rate(
    key: string,
    ratings: Array<[Session, number]>,
  ): Promise<void> {
    const artist = await prisma.artist.create({
      data: { name: `E2E Banda ${key}`, slug: `e2e-taste-${key}`, type: 'BAND' },
    });
    const release = await prisma.release.create({
      data: {
        title: `E2E Disco ${key}`,
        slug: `e2e-taste-disco-${key}`,
        type: 'ALBUM',
        releaseDate: new Date('2020-01-01'),
        artists: { create: { artistId: artist.id, role: 'PRIMARY' } },
      },
    });
    for (const [session, rating] of ratings) {
      await prisma.review.create({
        data: { userId: session.id, releaseId: release.id, rating },
      });
    }
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    ana = await createSession(app);
    bia = await createSession(app);
    caio = await createSession(app);

    await rate('um', [[ana, 9], [bia, 9]]); // as duas amam
    await rate('dois', [[ana, 8], [bia, 7]]); // as duas gostam
    await rate('tres', [[ana, 2], [bia, 9]]); // discordam
    await rate('quatro', [[bia, 10]]); // só a Bia: vira indicação para a Ana
    await rate('cinco', [[bia, 5]]); // só a Bia, nota baixa: não é indicação
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('busca de perfis', () => {
    const search = (q: string) =>
      request(server()).get(`${API}/users/search`).query({ q });

    it('é pública, acha pelo nome de usuário sem diferenciar maiúsculas e só traz dados públicos', async () => {
      const response = await search(bia.username.toUpperCase().slice(0, 8)).expect(200);
      const found = response.body.find(
        (user: { username: string }) => user.username === bia.username,
      );
      expect(found).toBeDefined();
      expect(found).not.toHaveProperty('email');
      expect(found).not.toHaveProperty('passwordHash');
    });

    it('exige pelo menos 2 letras e devolve no máximo 10 perfis', async () => {
      await search('a').expect(400);
      await search('').expect(400);
      await request(server()).get(`${API}/users/search`).expect(400);
      const many = await search('t_').expect(200);
      expect(many.body.length).toBeLessThanOrEqual(10);
    });

    it('um nome que ninguém tem volta lista vazia', async () => {
      expect((await search('zzzz-ninguem-xyz').expect(200)).body).toEqual([]);
    });
  });

  describe('gosto em comum', () => {
    it('exige login; perfil inexistente dá 404; o próprio perfil dá 400', async () => {
      await compare(null, bia.username).expect(401);
      await compare(ana, 'ninguem_e2e_xyz').expect(404);
      expect((await compare(ana, ana.username).expect(400)).body.code).toBe(
        'own_profile',
      );
    });

    it('calcula a porcentagem, as bandas que as duas gostam e as indicações', async () => {
      const { body } = await compare(ana, bia.username).expect(200);

      expect(body.sharedCount).toBe(3);
      expect(body.myRatedCount).toBe(3);
      expect(body.theirRatedCount).toBe(5);
      // Diferenças 0, 1 e 7: média 8/3, sobre 9 → 70%.
      expect(body.score).toBe(70);
      expect(body.bothLike.map((item: { artist: { slug: string } }) => item.artist.slug)).toEqual([
        'e2e-taste-um',
        'e2e-taste-dois',
      ]);
      expect(body.bothLike[0]).toMatchObject({ mine: 9, theirs: 9 });
      expect(body.recommended).toHaveLength(1);
      expect(body.recommended[0]).toMatchObject({
        artist: { slug: 'e2e-taste-quatro' },
        theirs: 10,
      });
    });

    it('a comparação é feita com quem pede: vista pela Bia, a indicação some', async () => {
      const { body } = await compare(bia, ana.username).expect(200);
      expect(body.recommended).toEqual([]);
      expect(body.score).toBe(70);
    });

    it('sem bandas em comum suficientes, não inventa porcentagem', async () => {
      const { body } = await compare(caio, bia.username).expect(200);
      expect(body.score).toBeNull();
      expect(body.sharedCount).toBe(0);
      expect(body.bothLike).toEqual([]);
      expect(body.recommended.map((item: { artist: { slug: string } }) => item.artist.slug)).toEqual([
        'e2e-taste-quatro',
        'e2e-taste-tres',
        'e2e-taste-um',
      ]);
    });
  });
});
