import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

type Session = Awaited<ReturnType<typeof createSession>>;

describe('Descoberta: busca, filtros e notas nas listas (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let a: Session;
  let b: Session;
  const server = () => app.getHttpServer();
  const get = (path: string) => request(server()).get(`${API}${path}`);
  const titles = (body: { items: Array<{ title: string }> }) =>
    body.items.map((item) => item.title);

  const post = async (path: string, body: object) =>
    (await request(server()).post(`${API}${path}`).set(admin.auth).send(body).expect(201)).body;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    a = await createSession(app);
    b = await createSession(app);

    const metal = await post('/genres', { name: 'E2E Metal', slug: 'e2e-metal' });
    const core = await post('/genres', {
      name: 'E2E Core',
      slug: 'e2e-core',
      parentId: metal.id,
    });
    const folk = await post('/genres', { name: 'E2E Folk', slug: 'e2e-folk' });

    const sofia = await post('/artists', {
      name: 'E2E Sôfia Ruído',
      slug: 'e2e-sofia-ruido',
      genreIds: [core.id],
    });
    const quieta = await post('/artists', {
      name: 'E2E Banda Quieta',
      slug: 'e2e-banda-quieta',
      genreIds: [folk.id],
    });

    const make = (artistId: string, title: string, releaseDate: string, type = 'ALBUM') =>
      post('/releases', {
        title,
        type,
        releaseDate,
        artists: [{ artistId }],
      });
    await make(sofia.id, 'Coração Elétrico', '2013-03-29');
    await make(sofia.id, 'Pequeno Ruído', '2015-06-01', 'EP');
    await make(quieta.id, 'Manhã de Domingo', '2013-09-10');
    await make(quieta.id, 'Cem% Verdade_Absoluta', '2020-01-01');

    // Notas: Coração Elétrico 9 e 7 (média 8); Manhã de Domingo 5; os demais sem nota.
    const rate = (session: Session, slug: string, rating: number) =>
      request(server())
        .put(`${API}/releases/${slug}/reviews/me`)
        .set(session.auth)
        .send({ rating })
        .expect(200);
    await rate(a, 'e2e-sofia-ruido-coracao-eletrico', 9);
    await rate(b, 'e2e-sofia-ruido-coracao-eletrico', 7);
    await rate(a, 'e2e-banda-quieta-manha-de-domingo', 5);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('busca de artistas', () => {
    it('ignora acentos e maiúsculas, dos dois lados', async () => {
      for (const q of ['sofia', 'SOFIA', 'sôfia', 'ruido', 'ruído']) {
        const { body } = await get(`/artists?q=${encodeURIComponent(q)}`).expect(200);
        expect(body.items.map((item: { slug: string }) => item.slug)).toEqual([
          'e2e-sofia-ruido',
        ]);
      }
    });

    it('exige todas as palavras, em qualquer ordem', async () => {
      const found = await get(`/artists?q=${encodeURIComponent('ruido e2e sofia')}`).expect(200);
      expect(found.body.items).toHaveLength(1);
      const none = await get(`/artists?q=${encodeURIComponent('sofia quieta')}`).expect(200);
      expect(none.body.items).toHaveLength(0);
    });

    it('trata % e _ como texto comum, não como curinga', async () => {
      for (const q of ['%', '_', 'e2e%ruido']) {
        const { body } = await get(`/artists?q=${encodeURIComponent(q)}`).expect(200);
        expect(body.items).toHaveLength(0);
      }
    });
  });

  describe('lista de lançamentos', () => {
    it('busca pelo título e pelo nome do artista, sem acento', async () => {
      const byTitle = await get(`/releases?q=${encodeURIComponent('coracao eletrico')}`).expect(200);
      expect(titles(byTitle.body)).toEqual(['Coração Elétrico']);

      const byArtist = await get(`/releases?q=${encodeURIComponent('SOFIA')}`).expect(200);
      expect(titles(byArtist.body).sort()).toEqual(['Coração Elétrico', 'Pequeno Ruído']);

      const mixed = await get(`/releases?q=${encodeURIComponent('sofia pequeno')}`).expect(200);
      expect(titles(mixed.body)).toEqual(['Pequeno Ruído']);
    });

    it('% e _ valem como texto também na busca de lançamentos', async () => {
      const literal = await get(`/releases?q=${encodeURIComponent('100%')}`).expect(200);
      expect(literal.body.items).toHaveLength(0);
      const real = await get(`/releases?q=${encodeURIComponent('cem% verdade_')}`).expect(200);
      expect(titles(real.body)).toEqual(['Cem% Verdade_Absoluta']);
    });

    it('filtra por gênero, incluindo os subgêneros', async () => {
      const parent = await get('/releases?genre=e2e-metal').expect(200);
      expect(titles(parent.body).sort()).toEqual(['Coração Elétrico', 'Pequeno Ruído']);
      const folk = await get('/releases?genre=e2e-folk').expect(200);
      expect(titles(folk.body).sort()).toEqual(['Cem% Verdade_Absoluta', 'Manhã de Domingo']);
      const missing = await get('/releases?genre=nao-existe').expect(200);
      expect(missing.body.items).toHaveLength(0);
    });

    it('filtra por ano e por tipo, e combina os filtros', async () => {
      const year = await get('/releases?genre=e2e-metal&year=2013').expect(200);
      expect(titles(year.body)).toEqual(['Coração Elétrico']);
      const ep = await get('/releases?genre=e2e-metal&type=EP').expect(200);
      expect(titles(ep.body)).toEqual(['Pequeno Ruído']);
      const both = await get('/releases?q=e2e&year=2013').expect(200);
      expect(titles(both.body).sort()).toEqual(['Coração Elétrico', 'Manhã de Domingo']);
    });

    it('recusa ano e ordenação inválidos', async () => {
      await get('/releases?year=abc').expect(400);
      await get('/releases?year=1200').expect(400);
      await get('/releases?sort=aleatorio').expect(400);
    });

    it('ordena por título, por mais recente e por nota (sem nota por último)', async () => {
      const filter = 'q=e2e';
      const byTitle = await get(`/releases?${filter}&sort=title`).expect(200);
      expect(titles(byTitle.body)).toEqual([
        'Cem% Verdade_Absoluta',
        'Coração Elétrico',
        'Manhã de Domingo',
        'Pequeno Ruído',
      ]);
      const recent = await get(`/releases?${filter}`).expect(200);
      expect(titles(recent.body)).toEqual([
        'Cem% Verdade_Absoluta',
        'Pequeno Ruído',
        'Manhã de Domingo',
        'Coração Elétrico',
      ]);
      const rated = await get(`/releases?${filter}&sort=rating`).expect(200);
      expect(titles(rated.body)).toEqual([
        'Coração Elétrico',
        'Manhã de Domingo',
        'Cem% Verdade_Absoluta',
        'Pequeno Ruído',
      ]);
    });

    it('pagina a ordem por nota sem repetir nem perder discos', async () => {
      const first = await get('/releases?q=e2e&sort=rating&limit=3&page=1').expect(200);
      const second = await get('/releases?q=e2e&sort=rating&limit=3&page=2').expect(200);
      expect(first.body.meta).toMatchObject({ total: 4, totalPages: 2 });
      expect([...titles(first.body), ...titles(second.body)]).toEqual([
        'Coração Elétrico',
        'Manhã de Domingo',
        'Cem% Verdade_Absoluta',
        'Pequeno Ruído',
      ]);
    });
  });

  describe('nota nos resumos de lançamento', () => {
    it('a lista traz média e contagem, e null sem avaliações', async () => {
      const { body } = await get('/releases?q=e2e&sort=title').expect(200);
      const byTitle = Object.fromEntries(
        body.items.map((item: { title: string; rating: object }) => [item.title, item.rating]),
      );
      expect(byTitle['Coração Elétrico']).toEqual({ average: 8, count: 2 });
      expect(byTitle['Manhã de Domingo']).toEqual({ average: 5, count: 1 });
      expect(byTitle['Pequeno Ruído']).toEqual({ average: null, count: 0 });
    });

    it('a discografia do artista traz a nota de cada disco', async () => {
      const { body } = await get('/artists/e2e-sofia-ruido').expect(200);
      const ratings = body.releases.map((r: { title: string; rating: object }) => [r.title, r.rating]);
      expect(ratings).toEqual([
        ['Pequeno Ruído', { average: null, count: 0 }],
        ['Coração Elétrico', { average: 8, count: 2 }],
      ]);
    });

    it('as avaliações no perfil trazem a média do disco, não só a nota da pessoa', async () => {
      const profile = await get(`/users/${(await meUsername(a))}/reviews`).expect(200);
      const review = profile.body.items.find(
        (item: { release: { title: string } }) => item.release.title === 'Coração Elétrico',
      );
      expect(review.rating).toBe(9);
      expect(review.release.rating).toEqual({ average: 8, count: 2 });
    });
  });

  async function meUsername(session: Session): Promise<string> {
    const { body } = await request(server()).get(`${API}/auth/me`).set(session.auth).expect(200);
    return body.username;
  }
});
