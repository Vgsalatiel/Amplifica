import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanTestData, createTestApp } from './helpers.js';

const API = '/api/v1/artists';

type Cover = { type: 'ALBUM' | 'EP' | 'SINGLE'; year: number; cover: string | null };

describe('Banda sem foto usa a capa de um disco (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const server = () => app.getHttpServer();

  async function band(
    key: string,
    options: { imagePath?: string; releases?: Cover[]; featuredOnly?: boolean },
  ) {
    const artist = await prisma.artist.create({
      data: {
        name: `E2E Capa ${key}`,
        slug: `e2e-capa-${key}`,
        type: 'BAND',
        imagePath: options.imagePath ?? null,
      },
    });
    const other = await prisma.artist.create({
      data: { name: `E2E Capa Outra ${key}`, slug: `e2e-capa-outra-${key}`, type: 'BAND' },
    });
    for (const [index, release] of (options.releases ?? []).entries()) {
      await prisma.release.create({
        data: {
          title: `E2E Capa Disco ${key} ${index}`,
          slug: `e2e-capa-disco-${key}-${index}`,
          type: release.type,
          releaseDate: new Date(`${release.year}-06-01`),
          coverPath: release.cover,
          artists: {
            create: options.featuredOnly
              ? [
                  { artistId: other.id, role: 'PRIMARY' },
                  { artistId: artist.id, role: 'FEATURED' },
                ]
              : [{ artistId: artist.id, role: 'PRIMARY' }],
          },
        },
      });
    }
  }

  const list = async () =>
    (await request(server()).get(`${API}?q=${encodeURIComponent('E2E Capa')}&limit=50`).expect(200))
      .body.items as Array<{
      slug: string;
      image: { large: string } | null;
      imageFromRelease: boolean;
    }>;
  const bySlug = async (key: string) =>
    (await list()).find((item) => item.slug === `e2e-capa-${key}`)!;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    await band('mix', {
      releases: [
        { type: 'SINGLE', year: 2026, cover: 'e2e-capa/single' },
        { type: 'ALBUM', year: 2020, cover: 'e2e-capa/album-antigo' },
        { type: 'ALBUM', year: 2024, cover: 'e2e-capa/album-novo' },
        { type: 'EP', year: 2025, cover: 'e2e-capa/ep' },
      ],
    });
    await band('single', { releases: [{ type: 'SINGLE', year: 2025, cover: 'e2e-capa/so-single' }] });
    await band('semcapa', { releases: [{ type: 'ALBUM', year: 2024, cover: null }] });
    await band('propria', {
      imagePath: 'e2e-capa/foto-propria',
      releases: [{ type: 'ALBUM', year: 2024, cover: 'e2e-capa/album-da-propria' }],
    });
    await band('participacao', {
      featuredOnly: true,
      releases: [{ type: 'ALBUM', year: 2024, cover: 'e2e-capa/de-outra-banda' }],
    });
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('sem foto, usa a capa do álbum mais recente, antes de EP e single', async () => {
    const artist = await bySlug('mix');
    expect(artist.imageFromRelease).toBe(true);
    expect(artist.image?.large).toContain('e2e-capa/album-novo');
  });

  it('sem álbum nem EP, usa a capa do single', async () => {
    const artist = await bySlug('single');
    expect(artist.imageFromRelease).toBe(true);
    expect(artist.image?.large).toContain('e2e-capa/so-single');
  });

  it('a foto cadastrada sempre ganha da capa', async () => {
    const artist = await bySlug('propria');
    expect(artist.imageFromRelease).toBe(false);
    expect(artist.image?.large).toContain('e2e-capa/foto-propria');
  });

  it('se nenhum disco tem capa, continua sem imagem', async () => {
    const artist = await bySlug('semcapa');
    expect(artist.image).toBeNull();
    expect(artist.imageFromRelease).toBe(false);
  });

  it('participação em disco de outra banda não empresta capa', async () => {
    const artist = await bySlug('participacao');
    expect(artist.image).toBeNull();
    expect(artist.imageFromRelease).toBe(false);
  });

  it('a página da banda segue a mesma regra', async () => {
    const mix = (await request(server()).get(`${API}/e2e-capa-mix`).expect(200)).body;
    expect(mix.imageFromRelease).toBe(true);
    expect(mix.image.large).toContain('e2e-capa/album-novo');
    const own = (await request(server()).get(`${API}/e2e-capa-propria`).expect(200)).body;
    expect(own.imageFromRelease).toBe(false);
    expect(own.image.large).toContain('e2e-capa/foto-propria');
  });
});
