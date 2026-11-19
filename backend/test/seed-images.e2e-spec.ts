import type { NestExpressApplication } from '@nestjs/platform-express';
import { ImagesService } from '../src/modules/images/images.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  loadImages,
  type ImageManifest,
} from '../src/scripts/images-import/load-images.js';
import request from 'supertest';
import { cleanTestData, createSession, createTestApp } from './helpers.js';
import { coverPng, grayPng } from './images.js';

describe('Carga de imagens (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let images: ImagesService;
  let png: Buffer;
  let gray: Buffer;

  const files: Record<string, () => Buffer> = {
    'banda.png': () => png,
    'outra.png': () => gray,
    'capa.png': () => png,
  };
  const readFile = async (path: string) => {
    const name = path.split('/').pop()!;
    const make = files[name];
    if (!make) {
      throw new Error(`ENOENT: ${name}`);
    }
    return make();
  };
  const load = (manifest: ImageManifest, replace = false, only?: string[]) =>
    loadImages({ prisma, images, readFile }, manifest, {
      baseDir: '/pasta',
      replace,
      only,
    });

  const manifest: ImageManifest = {
    artists: [{ slug: 'e2e-banda-foto', file: 'banda.png' }],
    releases: [{ slug: 'e2e-disco-foto', file: 'capa.png' }],
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    images = app.get(ImagesService);
    png = await coverPng();
    gray = await grayPng();
    await cleanTestData(app);
    const artist = await prisma.artist.create({
      data: { name: 'E2E Banda Foto', slug: 'e2e-banda-foto' },
    });
    await prisma.release.create({
      data: {
        title: 'E2E Disco Foto',
        slug: 'e2e-disco-foto',
        type: 'ALBUM',
        releaseDate: new Date('2024-01-01'),
        artists: { create: [{ artistId: artist.id, role: 'PRIMARY' }] },
      },
    });
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('grava a foto da banda e a capa do disco, com a cor de destaque', async () => {
    const report = await load(manifest);

    expect(report.stored).toEqual(['e2e-banda-foto', 'e2e-disco-foto']);
    const artist = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-foto' },
    });
    expect(artist.imagePath).toMatch(/^artists\/.+\/.+/);
    const release = await prisma.release.findUniqueOrThrow({
      where: { slug: 'e2e-disco-foto' },
    });
    expect(release.coverPath).toMatch(/^covers\/.+\/.+/);
    expect(release.accentColor).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('repetir mantém o que já tem imagem, e replace troca', async () => {
    const before = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-foto' },
    });

    const again = await load(manifest);
    expect(again.kept).toEqual(['e2e-banda-foto', 'e2e-disco-foto']);
    expect(again.stored).toEqual([]);

    const replaced = await load(
      {
        artists: [{ slug: 'e2e-banda-foto', file: 'outra.png' }],
        releases: [],
      },
      true,
    );
    expect(replaced.stored).toEqual(['e2e-banda-foto']);
    const after = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-foto' },
    });
    expect(after.imagePath).not.toBe(before.imagePath);
  });

  it('avisa o que não existe no banco e o arquivo que não abre, sem parar os outros', async () => {
    const report = await load(
      {
        artists: [
          { slug: 'e2e-nao-existe', file: 'banda.png' },
          { slug: 'e2e-banda-foto', file: 'sumiu.png' },
        ],
        releases: [],
      },
      true,
    );

    expect(report.missing).toEqual(['e2e-nao-existe']);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]).toMatch(/e2e-banda-foto.*ENOENT/);
  });

  it('only carrega só as bandas pedidas e deixa as outras do manifesto de lado', async () => {
    await prisma.artist.create({
      data: { name: 'E2E Banda So Uma', slug: 'e2e-banda-so-uma' },
    });
    const report = await load(
      {
        artists: [
          { slug: 'e2e-banda-so-uma', file: 'banda.png' },
          { slug: 'e2e-banda-foto', file: 'outra.png' },
        ],
        releases: [],
      },
      true,
      ['e2e-banda-so-uma'],
    );
    expect(report.stored).toEqual(['e2e-banda-so-uma']);
    const other = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-foto' },
    });
    expect(other.imagePath).not.toBeNull();
  });

  describe('crédito da foto', () => {
    const credit = {
      author: 'Fulana de Tal',
      license: 'CC BY 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Foto.jpg',
    };
    const detail = async () =>
      (
        await request(app.getHttpServer())
          .get('/api/v1/artists/e2e-banda-foto')
          .expect(200)
      ).body;

    it('a carga grava o crédito e a página da banda o mostra', async () => {
      await load(
        {
          artists: [{ slug: 'e2e-banda-foto', file: 'banda.png', credit }],
          releases: [],
        },
        true,
      );
      const body = await detail();
      expect(body.imageCredit).toEqual(credit);
    });

    it('trocar a foto sem crédito apaga o crédito antigo', async () => {
      await load(
        {
          artists: [{ slug: 'e2e-banda-foto', file: 'outra.png' }],
          releases: [],
        },
        true,
      );
      expect((await detail()).imageCredit).toBeNull();
    });

    it('a foto enviada ou removida pelo admin também apaga o crédito', async () => {
      const admin = await createSession(app, { admin: true });
      await load(
        {
          artists: [{ slug: 'e2e-banda-foto', file: 'banda.png', credit }],
          releases: [],
        },
        true,
      );
      expect((await detail()).imageCredit).toEqual(credit);

      const artistId = (
        await prisma.artist.findUniqueOrThrow({
          where: { slug: 'e2e-banda-foto' },
        })
      ).id;
      await request(app.getHttpServer())
        .delete(`/api/v1/artists/${artistId}/image`)
        .set(admin.auth)
        .expect(200);
      const after = await detail();
      expect(after.imageCredit).toBeNull();
    });

    it('um crédito gravado sem foto própria nunca aparece (capa emprestada não tem crédito)', async () => {
      await prisma.artist.update({
        where: { slug: 'e2e-banda-foto' },
        data: { imagePath: null, imageCredit: credit },
      });
      const body = await detail();
      expect(body.imageCredit).toBeNull();
    });
  });
});
