import type { NestExpressApplication } from '@nestjs/platform-express';
import { ImagesService } from '../src/modules/images/images.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  loadImages,
  type ImageManifest,
} from '../src/scripts/images-import/load-images.js';
import { cleanTestData, createTestApp } from './helpers.js';
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
  const load = (manifest: ImageManifest, replace = false) =>
    loadImages({ prisma, images, readFile }, manifest, {
      baseDir: '/pasta',
      replace,
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
});
