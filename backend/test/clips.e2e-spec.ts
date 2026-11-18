import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import {
  VideoCheckFailedError,
  VideoNotUsableError,
  YouTubeOEmbed,
} from '../src/modules/clips/youtube-oembed.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createSession, createTestApp } from './helpers.js';

const API = '/api/v1';

/** YouTube de mentira: nenhum teste depende da rede. Os títulos começam com "E2E ", para a limpeza achar. */
const fakeYouTube = {
  lookup: (videoId: string) => {
    if (videoId === 'AAAAAAAAAAA') {
      return Promise.reject(new VideoNotUsableError('privado'));
    }
    if (videoId === 'BBBBBBBBBBB') {
      return Promise.reject(new VideoCheckFailedError('fora do ar'));
    }
    return Promise.resolve({
      title: `E2E Clipe ${videoId}`,
      channelName: 'E2E Canal',
    });
  },
};

type Session = Awaited<ReturnType<typeof createSession>>;
const link = (id: string) => `https://www.youtube.com/watch?v=${id}`;

describe('Clipes da playlist (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let admin: Session;
  let ana: Session;
  let bia: Session;
  let caio: Session;
  let unverified: Session;
  const server = () => app.getHttpServer();

  const suggest = (session: Session | null, url: string) => {
    const req = request(server()).post(`${API}/clips`);
    return (session ? req.set(session.auth) : req).send({ url });
  };
  /** A playlist pública, só com o que é desta suíte. */
  const playlist = async () =>
    (
      (await request(server()).get(`${API}/clips?limit=50`).expect(200))
        .body as Array<{ title: string; pinned: boolean }>
    ).filter((clip) => clip.title.startsWith('E2E '));

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(YouTubeOEmbed).useValue(fakeYouTube),
    );
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    admin = await createSession(app, { admin: true });
    ana = await createSession(app);
    bia = await createSession(app);
    caio = await createSession(app);
    unverified = await createSession(app, { unverified: true });
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  describe('exigências para sugerir', () => {
    it('exige login', async () => {
      await suggest(null, link('CCCCCCCCCCC')).expect(401);
    });

    it('exige o e-mail confirmado', async () => {
      const response = await suggest(unverified, link('CCCCCCCCCCC')).expect(
        403,
      );
      expect(response.body.code).toBe('email_not_verified');
    });

    it('recusa o que não é link de vídeo do YouTube', async () => {
      for (const url of [
        'https://exemplo.com/video',
        'não é um link',
        'https://www.youtube.com/@canal',
        'javascript:alert(1)',
      ]) {
        const response = await suggest(ana, url).expect(400);
        expect(response.body.code).toBe('invalid_clip_link');
        expect(response.body.details[0].field).toBe('url');
      }
      await request(server())
        .post(`${API}/clips`)
        .set(ana.auth)
        .send({})
        .expect(400);
    });

    it('recusa vídeo privado ou sem incorporação (400) e avisa quando o YouTube não responde (503)', async () => {
      const unusable = await suggest(ana, link('AAAAAAAAAAA')).expect(400);
      expect(unusable.body.code).toBe('clip_unavailable');

      const down = await suggest(ana, link('BBBBBBBBBBB')).expect(503);
      expect(down.body.code).toBe('clip_check_failed');
    });

    it('um vídeo recusado pelo YouTube não consome o limite diário', async () => {
      const before = await prisma.clip.count({
        where: { submittedById: ana.id },
      });
      await suggest(ana, link('AAAAAAAAAAA')).expect(400);
      expect(
        await prisma.clip.count({ where: { submittedById: ana.id } }),
      ).toBe(before);
    });
  });

  describe('sugestão e moderação', () => {
    let suggestionId: string;

    it('a sugestão fica pendente e não aparece na playlist pública', async () => {
      const response = await suggest(bia, link('DDDDDDDDDDD')).expect(201);

      expect(response.body).toMatchObject({
        youtubeId: 'DDDDDDDDDDD',
        title: 'E2E Clipe DDDDDDDDDDD',
        channelName: 'E2E Canal',
        status: 'PENDING',
      });
      suggestionId = response.body.id;
      expect(await playlist()).toEqual([]);
    });

    it('aceita o link em outros formatos, mas o mesmo vídeo não entra duas vezes', async () => {
      const again = await suggest(
        caio,
        'https://youtu.be/DDDDDDDDDDD?si=abc',
      ).expect(409);
      expect(again.body.code).toBe('clip_already_suggested');

      await suggest(caio, 'https://youtu.be/EEEEEEEEEEE').expect(201);
    });

    it('a pessoa vê as próprias sugestões com a situação de cada uma', async () => {
      const mine = await request(server())
        .get(`${API}/clips/mine`)
        .set(bia.auth)
        .expect(200);
      expect(mine.body).toHaveLength(1);
      expect(mine.body[0]).toMatchObject({
        youtubeId: 'DDDDDDDDDDD',
        status: 'PENDING',
      });
      await request(server()).get(`${API}/clips/mine`).expect(401);
    });

    it('só administrador vê a fila e modera', async () => {
      for (const session of [ana, null]) {
        const req = (path: string, method: 'get' | 'patch' | 'delete') => {
          const r = request(server())[method](`${API}${path}`);
          return session ? r.set(session.auth) : r;
        };
        const expected = session ? 403 : 401;
        await req('/clips/review', 'get').expect(expected);
        await req(`/clips/${suggestionId}`, 'patch').expect(expected);
        await req(`/clips/${suggestionId}`, 'delete').expect(expected);
      }
    });

    it('a fila de moderação traz título, canal e quem sugeriu', async () => {
      const queue = await request(server())
        .get(`${API}/clips/review`)
        .set(admin.auth)
        .expect(200);

      const mine = queue.body.find(
        (clip: { id: string }) => clip.id === suggestionId,
      );
      expect(mine).toMatchObject({
        title: 'E2E Clipe DDDDDDDDDDD',
        status: 'PENDING',
        suggestedBy: { username: expect.any(String) },
      });
    });

    it('aprovar coloca na playlist, com a banda ligada, e mostra quem sugeriu', async () => {
      const artist = await prisma.artist.create({
        data: { name: 'E2E Banda Clipe', slug: 'e2e-banda-clipe' },
      });

      const approved = await request(server())
        .patch(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .send({ status: 'APPROVED', artistId: artist.id })
        .expect(200);
      expect(approved.body.status).toBe('APPROVED');

      const list = await playlist();
      expect(list.map((clip) => clip.title)).toContain('E2E Clipe DDDDDDDDDDD');
      const listed = (
        await request(server()).get(`${API}/clips?limit=50`).expect(200)
      ).body.find((clip: { id: string }) => clip.id === suggestionId);
      expect(listed).toMatchObject({
        pinned: false,
        artist: { slug: 'e2e-banda-clipe', name: 'E2E Banda Clipe' },
        suggestedBy: { username: expect.any(String) },
      });
    });

    it('recusar tira da playlist', async () => {
      await request(server())
        .patch(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .send({ status: 'REJECTED' })
        .expect(200);

      expect(await playlist()).toEqual([]);
      const rejected = await request(server())
        .get(`${API}/clips/review?status=REJECTED`)
        .set(admin.auth)
        .expect(200);
      expect(
        rejected.body.some((clip: { id: string }) => clip.id === suggestionId),
      ).toBe(true);
    });

    it('recusa banda que não existe e clipe que não existe', async () => {
      const badArtist = await request(server())
        .patch(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .send({
          status: 'APPROVED',
          artistId: '0193c1f0-0000-7000-8000-000000000000',
        })
        .expect(400);
      expect(badArtist.body.code).toBe('artist_not_found');

      await request(server())
        .patch(`${API}/clips/0193c1f0-0000-7000-8000-000000000000`)
        .set(admin.auth)
        .send({ status: 'APPROVED' })
        .expect(404);
      await request(server())
        .patch(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .send({ status: 'PENDING' })
        .expect(400);
    });

    it('remover apaga o clipe de vez', async () => {
      await request(server())
        .delete(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .expect(204);
      await request(server())
        .delete(`${API}/clips/${suggestionId}`)
        .set(admin.auth)
        .expect(404);
    });
  });

  describe('ordem da playlist', () => {
    it('os fixos vêm primeiro, na ordem de position; depois as sugestões, da mais nova para a mais antiga', async () => {
      await prisma.clip.createMany({
        data: [
          {
            youtubeId: 'FFFFFFFFFF1',
            title: 'E2E Fixo B',
            channelName: 'x',
            pinned: true,
            position: 1,
            status: 'APPROVED',
          },
          {
            youtubeId: 'FFFFFFFFFF2',
            title: 'E2E Fixo A',
            channelName: 'x',
            pinned: true,
            position: 0,
            status: 'APPROVED',
          },
        ],
      });
      // Duas sugestões aprovadas por um administrador, uma depois da outra.
      await suggest(admin, link('GGGGGGGGGG1')).expect(201);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await suggest(admin, link('GGGGGGGGGG2')).expect(201);

      const titles = (await playlist()).map((clip) => clip.title);

      expect(titles).toEqual([
        'E2E Fixo A',
        'E2E Fixo B',
        'E2E Clipe GGGGGGGGGG2',
        'E2E Clipe GGGGGGGGGG1',
      ]);
    });

    it('o clipe aprovado por último é o próximo, mesmo que tenha sido pedido antes', async () => {
      const early = (await suggest(ana, link('KKKKKKKKKK1')).expect(201)).body;
      await new Promise((resolve) => setTimeout(resolve, 20));
      const late = (await suggest(bia, link('KKKKKKKKKK2')).expect(201)).body;
      const approve = (id: string) =>
        request(server())
          .patch(`${API}/clips/${id}`)
          .set(admin.auth)
          .send({ status: 'APPROVED' })
          .expect(200);

      await approve(late.id);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await approve(early.id);

      const titles = (await playlist()).map((clip) => clip.title);
      expect(titles.indexOf('E2E Clipe KKKKKKKKKK1')).toBeLessThan(
        titles.indexOf('E2E Clipe KKKKKKKKKK2'),
      );
      expect(titles.indexOf('E2E Clipe KKKKKKKKKK1')).toBeLessThan(
        titles.indexOf('E2E Clipe GGGGGGGGGG2'),
      );
    });

    it('os clipes fixos não mostram quem sugeriu', async () => {
      const fixed = (
        await request(server()).get(`${API}/clips?limit=50`).expect(200)
      ).body.find((clip: { title: string }) => clip.title === 'E2E Fixo A');
      expect(fixed.suggestedBy).toBeNull();
    });

    it('a sugestão de administrador já entra aprovada', async () => {
      const mine = await request(server())
        .get(`${API}/clips/mine`)
        .set(admin.auth)
        .expect(200);
      expect(
        mine.body.every(
          (clip: { status: string }) => clip.status === 'APPROVED',
        ),
      ).toBe(true);
    });
  });

  describe('limite diário', () => {
    it('a quarta sugestão em 24 horas é barrada, mas administrador não tem teto', async () => {
      const dani = await createSession(app);
      for (const id of ['HHHHHHHHHH1', 'HHHHHHHHHH2', 'HHHHHHHHHH3']) {
        await suggest(dani, link(id)).expect(201);
      }

      const blocked = await suggest(dani, link('HHHHHHHHHH4')).expect(429);
      expect(blocked.body.code).toBe('clip_limit_reached');

      // O teto olha as últimas 24 horas: uma sugestão antiga deixa de contar.
      await prisma.clip.updateMany({
        where: { submittedById: dani.id, youtubeId: 'HHHHHHHHHH1' },
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });
      await suggest(dani, link('HHHHHHHHHH4')).expect(201);

      for (const id of [
        'IIIIIIIIII1',
        'IIIIIIIIII2',
        'IIIIIIIIII3',
        'IIIIIIIIII4',
      ]) {
        await suggest(admin, link(id)).expect(201);
      }
    });
  });
  describe('descobertas no perfil', () => {
    it('lista só os clipes aprovados que a pessoa sugeriu e conta o total', async () => {
      const eva = await createSession(app);
      const pending = (await suggest(eva, link('JJJJJJJJJJ1')).expect(201)).body;
      const approved = (await suggest(eva, link('JJJJJJJJJJ2')).expect(201)).body;
      const rejected = (await suggest(eva, link('JJJJJJJJJJ3')).expect(201)).body;
      for (const [id, status] of [
        [approved.id, 'APPROVED'],
        [rejected.id, 'REJECTED'],
      ]) {
        await request(server())
          .patch(`${API}/clips/${id}`)
          .set(admin.auth)
          .send({ status })
          .expect(200);
      }

      const response = await request(server())
        .get(`${API}/users/${eva.username}/discoveries`)
        .expect(200);
      expect(response.body.count).toBe(1);
      expect(response.body.items.map((clip: { id: string }) => clip.id)).toEqual([
        approved.id,
      ]);
      expect(response.body.items[0].suggestedBy.username).toBe(eva.username);
      expect(pending.status).toBe('PENDING');

      const newcomer = await createSession(app);
      const empty = await request(server())
        .get(`${API}/users/${newcomer.username}/discoveries`)
        .expect(200);
      expect(empty.body.count).toBe(0);
      await request(server())
        .get(`${API}/users/ninguem-e2e-xyz/discoveries`)
        .expect(404);
    });
  });
});
