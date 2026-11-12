import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

describe('Catálogo (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Awaited<ReturnType<typeof createSession>>;
  let member: Awaited<ReturnType<typeof createSession>>;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    member = await createSession(app);
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  const post = (path: string, body: object, session = admin) =>
    request(server()).post(`${API}${path}`).set(session.auth).send(body);

  describe('permissões', () => {
    it('visitante lê o catálogo sem login', async () => {
      await request(server()).get(`${API}/genres`).expect(200);
      await request(server()).get(`${API}/artists`).expect(200);
      await request(server()).get(`${API}/releases`).expect(200);
    });

    it('visitante recebe 401 ao tentar escrever', async () => {
      const response = await request(server())
        .post(`${API}/genres`)
        .send({ name: 'E2E Qualquer' })
        .expect(401);

      expect(response.body.code).toBe('unauthorized');
    });

    it('usuário comum recebe 403 em toda rota de escrita', async () => {
      const id = '0193c1f0-0000-7000-8000-000000000000';
      const attempts = [
        request(server()).post(`${API}/genres`).send({ name: 'E2E Genero' }),
        request(server())
          .patch(`${API}/genres/${id}`)
          .send({ name: 'E2E Outro' }),
        request(server()).delete(`${API}/genres/${id}`),
        request(server()).post(`${API}/artists`).send({ name: 'E2E Banda' }),
        request(server()).delete(`${API}/artists/${id}`),
        request(server()).put(`${API}/artists/${id}/image`),
        request(server()).post(`${API}/releases`).send({ title: 'E2E Disco' }),
        request(server()).put(`${API}/releases/${id}/cover`),
      ];

      for (const attempt of attempts) {
        const response = await attempt.set(member.auth);
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('forbidden');
      }
    });
  });

  describe('gêneros', () => {
    let metal: { id: string; slug: string };
    let metalcore: { id: string };

    it('gera o endereço a partir do nome e cria a árvore', async () => {
      metal = (await post('/genres', { name: 'E2E Metal' }).expect(201)).body;
      metalcore = (
        await post('/genres', {
          name: 'E2E Metalcore',
          parentId: metal.id,
        }).expect(201)
      ).body;

      expect(metal.slug).toBe('e2e-metal');

      const tree = (await request(server()).get(`${API}/genres`).expect(200))
        .body;
      const root = tree.find(
        (node: { slug: string }) => node.slug === 'e2e-metal',
      );
      expect(
        root.children.map((child: { slug: string }) => child.slug),
      ).toEqual(['e2e-metalcore']);
    });

    it('mostra o gênero com pai, filhos e contagem de artistas', async () => {
      const detail = (
        await request(server()).get(`${API}/genres/e2e-metalcore`).expect(200)
      ).body;

      expect(detail.parent.slug).toBe('e2e-metal');
      expect(detail.artistCount).toBe(0);
    });

    it('recusa nome repetido sem diferenciar maiúsculas', async () => {
      const response = await post('/genres', { name: 'e2e METAL' }).expect(409);

      expect(response.body.code).toBe('genre_name_taken');
      expect(response.body.details[0].field).toBe('name');
    });

    it('recusa um endereço informado que já existe', async () => {
      await post('/genres', {
        name: 'E2E Outro Nome',
        slug: 'e2e-metal',
      }).expect(409);
    });

    it('recusa pai inexistente e pai inválido', async () => {
      await post('/genres', {
        name: 'E2E Orfao',
        parentId: '0193c1f0-0000-7000-8000-000000000000',
      }).expect(400);
      await post('/genres', {
        name: 'E2E Orfao 2',
        parentId: 'nao-e-uuid',
      }).expect(400);
    });

    it('não deixa um gênero virar subgênero de si mesmo nem de um descendente', async () => {
      const self = await request(server())
        .patch(`${API}/genres/${metal.id}`)
        .set(admin.auth)
        .send({ parentId: metal.id })
        .expect(400);
      expect(self.body.code).toBe('genre_cycle');

      await request(server())
        .patch(`${API}/genres/${metal.id}`)
        .set(admin.auth)
        .send({ parentId: metalcore.id })
        .expect(400);
    });

    it('não exclui um gênero que tem subgêneros', async () => {
      const response = await request(server())
        .delete(`${API}/genres/${metal.id}`)
        .set(admin.auth)
        .expect(409);

      expect(response.body.code).toBe('genre_in_use');
    });

    it('edita e exclui um gênero sem uso', async () => {
      const leaf = (await post('/genres', { name: 'E2E Folha' }).expect(201))
        .body;

      const updated = await request(server())
        .patch(`${API}/genres/${leaf.id}`)
        .set(admin.auth)
        .send({ description: '  Uma descrição.  ' })
        .expect(200);
      expect(updated.body.description).toBe('Uma descrição.');

      await request(server())
        .delete(`${API}/genres/${leaf.id}`)
        .set(admin.auth)
        .expect(204);
      await request(server()).get(`${API}/genres/${leaf.slug}`).expect(404);
    });
  });

  describe('artistas, lançamentos e a discografia', () => {
    let metalId: string;
    let metalcoreId: string;
    let artist: { id: string; slug: string };

    beforeAll(async () => {
      const tree = (await request(server()).get(`${API}/genres`)).body;
      const root = tree.find(
        (node: { slug: string }) => node.slug === 'e2e-metal',
      );
      metalId = root.id;
      metalcoreId = root.children[0].id;
    });

    it('cria um artista com gêneros e gera o endereço', async () => {
      const response = await post('/artists', {
        name: 'E2E Vidro Fosco',
        country: 'br',
        city: 'Curitiba',
        formedYear: 2016,
        genreIds: [metalcoreId, metalcoreId],
      }).expect(201);
      artist = response.body;

      expect(artist.slug).toBe('e2e-vidro-fosco');
      expect(response.body).toMatchObject({
        type: 'BAND',
        country: 'BR',
        image: null,
      });
      expect(response.body.genres).toHaveLength(1);
    });

    it('acrescenta um número quando o endereço gerado já existe', async () => {
      const response = await post('/artists', {
        name: 'E2E Vidro Fosco',
      }).expect(201);

      expect(response.body.slug).toBe('e2e-vidro-fosco-2');
    });

    it('valida anos e país', async () => {
      const response = await post('/artists', {
        name: 'E2E Ano Errado',
        formedYear: 2020,
        disbandedYear: 2010,
        country: 'Brasil',
      }).expect(400);

      const fields = response.body.details.map(
        (detail: { field: string }) => detail.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining(['disbandedYear', 'country']),
      );
    });

    it('recusa gênero inexistente', async () => {
      const response = await post('/artists', {
        name: 'E2E Sem Genero',
        genreIds: ['0193c1f0-0000-7000-8000-000000000000'],
      }).expect(400);

      expect(response.body.code).toBe('genre_not_found');
    });

    it('lista com paginação, busca por nome e filtro por gênero com subgêneros', async () => {
      const bySearch = (
        await request(server())
          .get(`${API}/artists?q=vidro&limit=1`)
          .expect(200)
      ).body;
      expect(bySearch.items).toHaveLength(1);
      expect(bySearch.meta).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });

      // Filtrar pelo gênero PAI traz o artista cadastrado no subgênero.
      const byParent = (
        await request(server())
          .get(`${API}/artists?genre=e2e-metal`)
          .expect(200)
      ).body;
      expect(byParent.items.map((item: { slug: string }) => item.slug)).toEqual(
        ['e2e-vidro-fosco'],
      );

      const unknown = (
        await request(server())
          .get(`${API}/artists?genre=nao-existe`)
          .expect(200)
      ).body;
      expect(unknown.items).toEqual([]);
    });

    it('recusa parâmetros de paginação inválidos', async () => {
      await request(server()).get(`${API}/artists?limit=500`).expect(400);
      await request(server()).get(`${API}/artists?page=0`).expect(400);
    });

    it('substitui os gêneros do artista numa edição', async () => {
      const updated = await request(server())
        .patch(`${API}/artists/${artist.id}`)
        .set(admin.auth)
        .send({ genreIds: [metalId] })
        .expect(200);

      expect(
        updated.body.genres.map((genre: { slug: string }) => genre.slug),
      ).toEqual(['e2e-metal']);
      // Campos que não foram enviados continuam como estavam.
      expect(updated.body.type).toBe('BAND');
    });

    describe('lançamentos', () => {
      let release: { id: string; slug: string };

      const body = () => ({
        title: 'Tudo Que Sobrou do Inverno',
        type: 'ALBUM',
        releaseDate: '2024-06-14',
        youtube: 'https://youtu.be/dQw4w9WgXcQ?si=abc',
        artists: [{ artistId: artist.id }],
        tracks: [
          { title: 'Geada', position: 1, durationMs: 168000 },
          { title: 'Vidro', position: 2, durationMs: 207000 },
          { title: 'Interlúdio', position: 1, discNumber: 2 },
        ],
      });

      it('cria o lançamento com artistas, faixas, vídeo e endereço', async () => {
        const response = await post('/releases', body()).expect(201);
        release = response.body;

        expect(release.slug).toBe('e2e-vidro-fosco-tudo-que-sobrou-do-inverno');
        expect(response.body).toMatchObject({
          releaseDate: '2024-06-14',
          datePrecision: 'DAY',
          youtubeVideoId: 'dQw4w9WgXcQ',
          cover: null,
          accentColor: null,
          durationMs: 375000,
        });
        expect(response.body.artists).toEqual([
          expect.objectContaining({ slug: 'e2e-vidro-fosco', role: 'PRIMARY' }),
        ]);
        // Faixas ordenadas por disco e posição.
        expect(
          response.body.tracks.map((track: { title: string }) => track.title),
        ).toEqual(['Geada', 'Vidro', 'Interlúdio']);
      });

      it('guarda só a parte conhecida da data', async () => {
        const response = await post('/releases', {
          ...body(),
          title: 'Demo Antigo',
          releaseDate: '2011',
          youtube: '',
          tracks: [],
        }).expect(201);

        expect(response.body).toMatchObject({
          releaseDate: '2011',
          datePrecision: 'YEAR',
          youtubeVideoId: null,
          durationMs: null,
        });
      });

      it('valida data, vídeo, cor, artistas e faixas', async () => {
        const response = await post('/releases', {
          title: 'E2E Invalido',
          type: 'ALBUM',
          releaseDate: '2024-02-30',
          youtube: 'https://vimeo.com/123',
          accentColor: '#FFEB3B',
          artists: [{ artistId: artist.id }, { artistId: artist.id }],
          tracks: [
            { title: 'A', position: 1 },
            { title: 'B', position: 1 },
          ],
        }).expect(400);

        const fields = response.body.details.map(
          (detail: { field: string }) => detail.field,
        );
        expect(fields).toEqual(
          expect.arrayContaining([
            'releaseDate',
            'youtube',
            'accentColor',
            'artists',
            'tracks',
          ]),
        );
      });

      it('recusa artista inexistente', async () => {
        const response = await post('/releases', {
          ...body(),
          title: 'E2E Sem Artista',
          artists: [{ artistId: '0193c1f0-0000-7000-8000-000000000000' }],
        }).expect(400);

        expect(response.body.code).toBe('artist_not_found');
      });

      it('mostra a discografia do artista, do mais recente ao mais antigo', async () => {
        const detail = (
          await request(server())
            .get(`${API}/artists/e2e-vidro-fosco`)
            .expect(200)
        ).body;

        expect(
          detail.releases.map(
            (item: { releaseDate: string }) => item.releaseDate,
          ),
        ).toEqual(['2024-06-14', '2011']);
      });

      it('filtra lançamentos por tipo e por artista', async () => {
        const byArtist = (
          await request(server())
            .get(`${API}/releases?artist=e2e-vidro-fosco`)
            .expect(200)
        ).body;
        expect(byArtist.meta.total).toBe(2);

        const singles = (
          await request(server())
            .get(`${API}/releases?artist=e2e-vidro-fosco&type=SINGLE`)
            .expect(200)
        ).body;
        expect(singles.items).toEqual([]);
      });

      it('substitui faixas e artistas numa edição, e preserva o resto', async () => {
        const updated = await request(server())
          .patch(`${API}/releases/${release.id}`)
          .set(admin.auth)
          .send({
            tracks: [{ title: 'Faixa Única', position: 1 }],
            description: 'Segundo disco.',
          })
          .expect(200);

        expect(
          updated.body.tracks.map((track: { title: string }) => track.title),
        ).toEqual(['Faixa Única']);
        expect(updated.body).toMatchObject({
          description: 'Segundo disco.',
          youtubeVideoId: 'dQw4w9WgXcQ',
          artists: [expect.objectContaining({ slug: 'e2e-vidro-fosco' })],
        });
      });

      it('não exclui artista nem gênero que têm lançamentos ou artistas', async () => {
        const artistResponse = await request(server())
          .delete(`${API}/artists/${artist.id}`)
          .set(admin.auth)
          .expect(409);
        expect(artistResponse.body.code).toBe('artist_has_releases');

        await request(server())
          .delete(`${API}/genres/${metalId}`)
          .set(admin.auth)
          .expect(409);
      });

      it('exclui o lançamento com as faixas, e depois o artista fica livre para excluir', async () => {
        await request(server())
          .delete(`${API}/releases/${release.id}`)
          .set(admin.auth)
          .expect(204);
        await request(server())
          .get(`${API}/releases/${release.slug}`)
          .expect(404);

        const rest = (
          await request(server()).get(`${API}/releases?artist=e2e-vidro-fosco`)
        ).body;
        for (const item of rest.items) {
          await request(server())
            .delete(`${API}/releases/${item.id}`)
            .set(admin.auth)
            .expect(204);
        }
        await request(server())
          .delete(`${API}/artists/${artist.id}`)
          .set(admin.auth)
          .expect(204);
      });
    });
  });
});
