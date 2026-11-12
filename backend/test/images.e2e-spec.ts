import type { NestExpressApplication } from '@nestjs/platform-express';
import { StorageDisk } from '@nestjs/storage';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';
import { coverPng, grayPng } from './images.js';

const API = '/api/v1';

describe('Imagens (e2e)', () => {
  let app: NestExpressApplication;
  let admin: Awaited<ReturnType<typeof createSession>>;
  let disk: { exists(key: string): Promise<boolean> };
  let artistId: string;
  let releaseId: string;
  const server = () => app.getHttpServer();

  /** "https://files.test/covers/x/abc-lg.webp" -> "covers/x/abc-lg.webp" */
  const keyOf = (url: string) => new URL(url).pathname.slice(1);

  beforeAll(async () => {
    app = await createTestApp();
    await cleanTestData(app);
    disk = app.get(StorageDisk);
    admin = await createSession(app, { admin: true });

    artistId = (
      await request(server())
        .post(`${API}/artists`)
        .set(admin.auth)
        .send({ name: 'E2E Imagens' })
    ).body.id;
    releaseId = (
      await request(server())
        .post(`${API}/releases`)
        .set(admin.auth)
        .send({
          title: 'Capa de Teste',
          type: 'ALBUM',
          releaseDate: '2024',
          artists: [{ artistId }],
        })
    ).body.id;
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  const putCover = (file: Buffer, name = 'capa.png') =>
    request(server())
      .put(`${API}/releases/${releaseId}/cover`)
      .set(admin.auth)
      .attach('file', file, { filename: name });

  it('grava duas versões da capa e extrai a cor de destaque', async () => {
    const response = await putCover(await coverPng()).expect(200);

    expect(response.body.cover.large).toMatch(/\/covers\/.+-lg\.webp$/);
    expect(response.body.cover.small).toMatch(/\/covers\/.+-sm\.webp$/);
    expect(await disk.exists(keyOf(response.body.cover.large))).toBe(true);
    expect(await disk.exists(keyOf(response.body.cover.small))).toBe(true);

    // O "sol" da capa é vermelho: a cor extraída deve ser um vermelho legível sobre branco.
    expect(response.body.accentColor).toMatch(/^#[0-9A-F]{6}$/);
    const red = parseInt(response.body.accentColor.slice(1, 3), 16);
    const green = parseInt(response.body.accentColor.slice(3, 5), 16);
    expect(red).toBeGreaterThan(green + 60);
  });

  it('ao trocar a capa, apaga os arquivos da anterior', async () => {
    const before = (
      await request(server()).get(`${API}/releases?artist=e2e-imagens`)
    ).body.items[0].cover.large as string;

    const after = (await putCover(await grayPng(), 'outra.png').expect(200))
      .body;

    expect(await disk.exists(keyOf(after.cover.large))).toBe(true);
    expect(await disk.exists(keyOf(before))).toBe(false);
    // Capa sem cor marcante: a página volta à cor padrão do site.
    expect(after.accentColor).toBeNull();
  });

  it('o admin pode definir a cor à mão, e ela precisa ser legível', async () => {
    const ok = await request(server())
      .patch(`${API}/releases/${releaseId}`)
      .set(admin.auth)
      .send({ accentColor: '#1e5aa8' })
      .expect(200);
    expect(ok.body.accentColor).toBe('#1E5AA8');

    await request(server())
      .patch(`${API}/releases/${releaseId}`)
      .set(admin.auth)
      .send({ accentColor: '#FFEB3B' })
      .expect(400);
  });

  it('remove a capa e a cor', async () => {
    const response = await request(server())
      .delete(`${API}/releases/${releaseId}/cover`)
      .set(admin.auth)
      .expect(200);

    expect(response.body).toMatchObject({ cover: null, accentColor: null });
  });

  it('confere o conteúdo do arquivo, não o nome nem o tipo declarado', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>');

    const response = await putCover(html, 'foto.png').expect(400);

    expect(response.body.code).toBe('invalid_image');
    expect(response.body.details[0].field).toBe('file');
  });

  it('recusa imagem corrompida', async () => {
    const png = await coverPng();
    // Cabeçalho de PNG válido seguido de lixo.
    const corrupted = Buffer.concat([
      png.subarray(0, 40),
      Buffer.alloc(200, 7),
    ]);

    await putCover(corrupted).expect(400);
  });

  it('recusa envio sem arquivo', async () => {
    const response = await request(server())
      .put(`${API}/releases/${releaseId}/cover`)
      .set(admin.auth)
      .expect(400);

    expect(response.body.code).toBe('image_required');
  });

  it('recusa arquivo acima de 5 MB', async () => {
    const big = Buffer.concat([
      (await coverPng()).subarray(0, 16),
      Buffer.alloc(5 * 1024 * 1024 + 1),
    ]);

    await putCover(big).expect(413);
  });

  it('responde 404 ao enviar capa de lançamento que não existe', async () => {
    await request(server())
      .put(`${API}/releases/0193c1f0-0000-7000-8000-000000000000/cover`)
      .set(admin.auth)
      .attach('file', await coverPng(), { filename: 'capa.png' })
      .expect(404);
  });

  it('grava a foto do artista', async () => {
    const response = await request(server())
      .put(`${API}/artists/${artistId}/image`)
      .set(admin.auth)
      .attach('file', await coverPng(), { filename: 'banda.png' })
      .expect(200);

    expect(response.body.image.large).toMatch(/\/artists\/.+-lg\.webp$/);
  });

  describe('avatar', () => {
    it('qualquer pessoa logada troca o próprio avatar, recortado em quadrado', async () => {
      const member = await createSession(app);

      const response = await request(server())
        .put(`${API}/users/me/avatar`)
        .set(member.auth)
        .attach('file', await coverPng(), { filename: 'eu.png' })
        .expect(200);

      expect(response.body.avatar.small).toMatch(/\/avatars\/.+-sm\.webp$/);

      const sharp = (await import('sharp')).default;
      const stored = await (disk as unknown as StorageDisk).getBuffer(
        keyOf(response.body.avatar.small),
      );
      expect(await sharp(stored).metadata()).toMatchObject({
        width: 96,
        height: 96,
      });

      // E o perfil público passa a mostrar o avatar.
      const profile = (
        await request(server()).get(`${API}/users/${response.body.username}`)
      ).body;
      expect(profile.avatar.large).toBe(response.body.avatar.large);

      const removed = await request(server())
        .delete(`${API}/users/me/avatar`)
        .set(member.auth)
        .expect(200);
      expect(removed.body.avatar).toBeNull();
    });

    it('exige login', async () => {
      await request(server())
        .put(`${API}/users/me/avatar`)
        .attach('file', await coverPng(), { filename: 'eu.png' })
        .expect(401);
    });
  });
});
