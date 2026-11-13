import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

type Session = Awaited<ReturnType<typeof createSession>>;

/** Dia relativo a hoje, como "AAAA-MM-DD" (UTC: a margem de dias nos testes cobre o fuso). */
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

describe('Shows (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Session;
  let user: Session;
  const server = () => app.getHttpServer();
  const get = (path: string) => request(server()).get(`${API}${path}`);
  const post = (path: string, session: Session | null, body: object) => {
    const req = request(server()).post(`${API}${path}`);
    return (session ? req.set(session.auth) : req).send(body);
  };
  const slugs = (body: { items: Array<{ slug: string }> }) =>
    body.items.map((item) => item.slug);

  let coreId: string;
  let folkId: string;
  let bandId: string;

  const showBody = (overrides: Record<string, unknown> = {}) => ({
    date: daysFromNow(30),
    venue: 'Espaço de Teste',
    city: 'São Paulo',
    state: 'SP',
    acts: [{ name: 'E2E Banda Visitante' }],
    ...overrides,
  });
  const createShow = async (
    slug: string,
    overrides: Record<string, unknown> = {},
  ) =>
    (
      await post(
        '/shows',
        admin,
        showBody({ slug: `e2e-${slug}`, ...overrides }),
      ).expect(201)
    ).body;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    user = await createSession(app);

    const genre = async (body: object) =>
      (await post('/genres', admin, body).expect(201)).body;
    const metal = await genre({
      name: 'E2E Metal Shows',
      slug: 'e2e-metal-shows',
    });
    const core = await genre({
      name: 'E2E Core Shows',
      slug: 'e2e-core-shows',
      parentId: metal.id,
    });
    const folk = await genre({
      name: 'E2E Folk Shows',
      slug: 'e2e-folk-shows',
    });
    coreId = core.id;
    folkId = folk.id;

    bandId = (
      await post('/artists', admin, {
        name: 'E2E Banda do Catálogo',
        slug: 'e2e-banda-do-catalogo',
      }).expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('permissões', () => {
    it('visitante e usuário comum não criam nem alteram shows', async () => {
      await post('/shows', null, showBody({ slug: 'e2e-sem-login' })).expect(
        401,
      );
      await post(
        '/shows',
        user,
        showBody({ slug: 'e2e-sem-permissao' }),
      ).expect(403);

      const show = await createShow('permissoes');
      await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(user.auth)
        .send({ city: 'Outra' })
        .expect(403);
      await request(server())
        .delete(`${API}/shows/${show.id}`)
        .set(user.auth)
        .expect(403);
    });

    it('qualquer visitante lê a agenda e o detalhe', async () => {
      const show = await createShow('leitura-publica');
      await get('/shows').expect(200);
      await get(`/shows/${show.slug}`).expect(200);
    });
  });

  describe('criação', () => {
    it('grava a escalação em ordem, liga a banda do catálogo e devolve os gêneros', async () => {
      const { body } = await post(
        '/shows',
        admin,
        showBody({
          slug: 'e2e-festival',
          name: 'E2E Festival',
          startTime: '18:30',
          ticketUrl: 'https://ingressos.exemplo.test/festival',
          acts: [
            { name: 'E2E Banda do Catálogo', artistId: bandId },
            { name: 'E2E Banda de Fora' },
          ],
          genreIds: [coreId, folkId],
        }),
      ).expect(201);

      expect(body).toMatchObject({
        slug: 'e2e-festival',
        name: 'E2E Festival',
        startTime: '18:30',
        venue: 'Espaço de Teste',
        city: 'São Paulo',
        state: 'SP',
        status: 'CONFIRMED',
        ticketUrl: 'https://ingressos.exemplo.test/festival',
      });
      expect(
        body.acts.map((act: { name: string; position: number }) => [
          act.position,
          act.name,
        ]),
      ).toEqual([
        [0, 'E2E Banda do Catálogo'],
        [1, 'E2E Banda de Fora'],
      ]);
      expect(body.acts[0].artist).toMatchObject({
        slug: 'e2e-banda-do-catalogo',
      });
      expect(body.acts[1].artist).toBeNull();
      expect(body.genres.map((g: { slug: string }) => g.slug).sort()).toEqual([
        'e2e-core-shows',
        'e2e-folk-shows',
      ]);
      expect(new Date(body.verifiedAt).getTime()).toBeGreaterThan(
        Date.now() - 60_000,
      );
    });

    it('cria o endereço a partir do nome, da cidade e da data, e evita repetição', async () => {
      const date = daysFromNow(40);
      const make = async () =>
        (
          await post(
            '/shows',
            admin,
            showBody({
              date,
              city: 'Belo Horizonte',
              state: 'mg',
              acts: [{ name: 'E2E Slug Automático' }],
            }),
          ).expect(201)
        ).body;

      const first = await make();
      const second = await make();
      expect(first.slug).toBe(`e2e-slug-automatico-belo-horizonte-${date}`);
      expect(second.slug).toBe(`${first.slug}-2`);
      expect(first.state).toBe('MG');
    });

    it('recusa dados inválidos com mensagens por campo', async () => {
      const { body } = await post('/shows', admin, {
        date: '2027-02-30',
        venue: '',
        state: 'XX',
        acts: [],
      }).expect(400);
      const fields = body.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(
        expect.arrayContaining(['date', 'venue', 'city', 'state', 'acts']),
      );
    });

    it('recusa banda e gênero que não existem, dizendo qual', async () => {
      const missing = '0190d4e0-0000-7000-8000-00000000dead';
      const artist = await post(
        '/shows',
        admin,
        showBody({
          slug: 'e2e-sem-banda',
          acts: [{ name: 'X', artistId: missing }],
        }),
      ).expect(400);
      expect(artist.body.code).toBe('artist_not_found');
      const genre = await post(
        '/shows',
        admin,
        showBody({ slug: 'e2e-sem-genero', genreIds: [missing] }),
      ).expect(400);
      expect(genre.body.code).toBe('genre_not_found');
    });

    it('recusa endereço já usado', async () => {
      await createShow('endereco-repetido');
      const { body } = await post(
        '/shows',
        admin,
        showBody({ slug: 'e2e-endereco-repetido' }),
      ).expect(409);
      expect(body.code).toBe('slug_taken');
    });

    it('não guarda link fora de http/https', async () => {
      await post(
        '/shows',
        admin,
        showBody({ slug: 'e2e-link-ruim', ticketUrl: 'javascript:alert(1)' }),
      ).expect(400);
    });
  });

  describe('agenda', () => {
    let future: { slug: string };
    let soon: { slug: string };
    let past: { slug: string };
    let cancelled: { slug: string };

    beforeAll(async () => {
      soon = await createShow('agenda-soon', {
        date: daysFromNow(3),
        city: 'Curitiba',
        state: 'PR',
        genreIds: [coreId],
        acts: [{ name: 'E2E Agenda Soon', artistId: bandId }],
      });
      future = await createShow('agenda-future', {
        date: daysFromNow(200),
        city: 'Porto Alegre',
        state: 'RS',
        genreIds: [folkId],
      });
      past = await createShow('agenda-past', {
        date: daysFromNow(-20),
        city: 'Recife',
        state: 'PE',
      });
      cancelled = await createShow('agenda-cancelled', {
        date: daysFromNow(10),
        status: 'CANCELLED',
      });
    });

    it('por padrão traz só os próximos, do mais perto para o mais longe, sem cancelados', async () => {
      const { body } = await get('/shows?limit=50').expect(200);
      const found = slugs(body).filter((slug: string) =>
        slug.startsWith('e2e-agenda-'),
      );
      expect(found).toEqual([soon.slug, future.slug]);
      expect(slugs(body)).not.toContain(cancelled.slug);
      expect(slugs(body)).not.toContain(past.slug);
    });

    it('when=past traz os que já passaram, do mais recente para o mais antigo', async () => {
      const { body } = await get('/shows?when=past&limit=50').expect(200);
      expect(slugs(body)).toContain(past.slug);
      expect(slugs(body)).not.toContain(soon.slug);
    });

    it('when=all traz passados e futuros', async () => {
      const { body } = await get('/shows?when=all&limit=50').expect(200);
      expect(slugs(body)).toEqual(
        expect.arrayContaining([past.slug, soon.slug, future.slug]),
      );
    });

    it('status=CANCELLED mostra os cancelados', async () => {
      const { body } = await get('/shows?status=CANCELLED&limit=50').expect(
        200,
      );
      expect(slugs(body)).toContain(cancelled.slug);
      expect(slugs(body)).not.toContain(soon.slug);
    });

    it('filtra por estado e por cidade (sem diferenciar maiúsculas)', async () => {
      expect(
        slugs((await get('/shows?state=pr&limit=50').expect(200)).body),
      ).toEqual([soon.slug]);
      expect(
        slugs(
          (await get('/shows?city=porto%20alegre&limit=50').expect(200)).body,
        ),
      ).toEqual([future.slug]);
    });

    it('filtra por gênero, incluindo os subgêneros', async () => {
      // "core" é subgênero de "metal": buscar por metal traz o show de core.
      const byParent = await get(
        '/shows?genre=e2e-metal-shows&limit=50',
      ).expect(200);
      expect(slugs(byParent.body)).toContain(soon.slug);
      expect(slugs(byParent.body)).not.toContain(future.slug);

      const folk = await get('/shows?genre=e2e-folk-shows&limit=50').expect(
        200,
      );
      expect(slugs(folk.body)).toContain(future.slug);

      expect(
        (await get('/shows?genre=nao-existe').expect(200)).body.items,
      ).toEqual([]);
    });

    it('filtra pela banda do catálogo', async () => {
      const { body } = await get(
        '/shows?artist=e2e-banda-do-catalogo&limit=50',
      ).expect(200);
      expect(slugs(body)).toContain(soon.slug);
      expect(slugs(body)).not.toContain(future.slug);
    });

    it('filtra por mês', async () => {
      const month = daysFromNow(200).slice(0, 7);
      const { body } = await get(`/shows?month=${month}&limit=50`).expect(200);
      expect(slugs(body)).toContain(future.slug);
      expect(slugs(body)).not.toContain(soon.slug);
      await get('/shows?month=2027-13').expect(400);
    });

    it('pagina e informa o total', async () => {
      const { body } = await get('/shows?limit=1&page=1').expect(200);
      expect(body.items).toHaveLength(1);
      expect(body.meta).toMatchObject({ page: 1, limit: 1 });
      expect(body.meta.total).toBeGreaterThan(1);
    });
  });

  describe('detalhe, edição e exclusão', () => {
    it('devolve 404 para endereço que não existe', async () => {
      const { body } = await get('/shows/nao-existe').expect(404);
      expect(body.code).toBe('show_not_found');
    });

    it('a edição troca só o que foi enviado, e a escalação por inteiro', async () => {
      const show = await createShow('edicao', {
        acts: [{ name: 'E2E Antiga A' }, { name: 'E2E Antiga B' }],
        genreIds: [folkId],
        startTime: '20:00',
      });

      const { body } = await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .send({
          city: 'Campinas',
          status: 'SOLD_OUT',
          acts: [{ name: 'E2E Nova' }],
        })
        .expect(200);

      expect(body).toMatchObject({
        city: 'Campinas',
        status: 'SOLD_OUT',
        startTime: '20:00',
        venue: 'Espaço de Teste',
      });
      expect(body.acts.map((act: { name: string }) => act.name)).toEqual([
        'E2E Nova',
      ]);
      // Gêneros não vieram na edição: continuam os mesmos.
      expect(body.genres.map((g: { slug: string }) => g.slug)).toEqual([
        'e2e-folk-shows',
      ]);
    });

    it('editar sem enviar status não volta o show para "confirmado"', async () => {
      const show = await createShow('status-mantido', { status: 'SOLD_OUT' });
      const { body } = await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .send({ venue: 'Outro Local' })
        .expect(200);
      expect(body.status).toBe('SOLD_OUT');
    });

    it('limpa horário e link com valor vazio', async () => {
      const show = await createShow('limpar', {
        startTime: '21:00',
        ticketUrl: 'https://ingressos.exemplo.test/x',
      });
      const { body } = await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .send({ startTime: '', ticketUrl: '' })
        .expect(200);
      expect(body.startTime).toBeNull();
      expect(body.ticketUrl).toBeNull();
    });

    it('a data de conferência só muda quando é enviada', async () => {
      const show = await createShow('conferencia', {
        verifiedAt: '2026-01-10',
      });
      expect(show.verifiedAt.slice(0, 10)).toBe('2026-01-10');

      const kept = await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .send({ city: 'Santos' })
        .expect(200);
      expect(kept.body.verifiedAt.slice(0, 10)).toBe('2026-01-10');

      const updated = await request(server())
        .patch(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .send({ verifiedAt: '2026-02-01' })
        .expect(200);
      expect(updated.body.verifiedAt.slice(0, 10)).toBe('2026-02-01');
    });

    it('recusa trocar o endereço por um que outro show já usa', async () => {
      const a = await createShow('troca-a');
      await createShow('troca-b');
      await request(server())
        .patch(`${API}/shows/${a.id}`)
        .set(admin.auth)
        .send({ slug: 'e2e-troca-b' })
        .expect(409);
    });

    it('edição de show inexistente devolve 404', async () => {
      await request(server())
        .patch(`${API}/shows/0190d4e0-0000-7000-8000-00000000dead`)
        .set(admin.auth)
        .send({ city: 'X' })
        .expect(404);
    });

    it('exclui o show e leva escalação e gêneros junto', async () => {
      const show = await createShow('exclusao', { genreIds: [folkId] });
      await request(server())
        .delete(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .expect(204);
      await get(`/shows/${show.slug}`).expect(404);
      await request(server())
        .delete(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .expect(404);
    });
  });

  describe('ligações com o catálogo', () => {
    it('apagar a banda do catálogo mantém o show e só desfaz o link', async () => {
      const artist = (
        await post('/artists', admin, {
          name: 'E2E Banda Efêmera',
          slug: 'e2e-banda-efemera',
        }).expect(201)
      ).body;
      const show = await createShow('banda-efemera', {
        acts: [{ name: 'E2E Banda Efêmera', artistId: artist.id }],
      });

      await request(server())
        .delete(`${API}/artists/${artist.id}`)
        .set(admin.auth)
        .expect(204);

      const { body } = await get(`/shows/${show.slug}`).expect(200);
      expect(body.acts[0]).toMatchObject({
        name: 'E2E Banda Efêmera',
        artist: null,
      });
    });

    it('não deixa excluir um gênero em uso por um show', async () => {
      const genre = (
        await post('/genres', admin, {
          name: 'E2E Gênero em Show',
          slug: 'e2e-genero-em-show',
        }).expect(201)
      ).body;
      const show = await createShow('genero-em-uso', { genreIds: [genre.id] });

      const blocked = await request(server())
        .delete(`${API}/genres/${genre.id}`)
        .set(admin.auth)
        .expect(409);
      expect(blocked.body.code).toBe('genre_in_use');

      await request(server())
        .delete(`${API}/shows/${show.id}`)
        .set(admin.auth)
        .expect(204);
      await request(server())
        .delete(`${API}/genres/${genre.id}`)
        .set(admin.auth)
        .expect(204);
    });
  });
});
