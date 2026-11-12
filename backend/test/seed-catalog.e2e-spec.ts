import type { NestExpressApplication } from '@nestjs/platform-express';
import { ServiceUnavailableException } from '@nestjs/common';
import { ImagesService } from '../src/modules/images/images.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  catalogFileSchema,
  type CatalogFile,
} from '../src/scripts/catalog-import/catalog-file.js';
import { loadCatalog } from '../src/scripts/catalog-import/load-catalog.js';
import { cleanTestData, createTestApp } from './helpers.js';
import { coverPng } from './images.js';

function dataFile(): CatalogFile {
  return catalogFileSchema.parse({
    generatedAt: '2026-11-12T00:00:00Z',
    source: 'teste',
    artist: {
      mbid: null,
      name: 'E2E Banda Importada',
      slug: 'e2e-banda-importada',
      type: 'BAND',
      country: 'GB',
      city: 'Sheffield',
      formedYear: 2004,
      disbandedYear: null,
      bio: 'Texto original.',
      sources: [{ name: 'Fonte', url: 'https://exemplo.com' }],
      genres: ['e2e-genero-importado'],
    },
    releases: [
      {
        mbid: 'e2e-mbid-1',
        releaseMbid: null,
        title: 'Primeiro Disco',
        type: 'ALBUM',
        releaseDate: '2006-10-30',
        description: null,
        coverUrl: 'https://capas.test/1.png',
        tracks: [
          { title: 'Faixa A', discNumber: 1, position: 1, durationMs: 200000 },
          { title: 'Faixa B', discNumber: 1, position: 2, durationMs: null },
        ],
      },
      {
        mbid: 'e2e-mbid-2',
        releaseMbid: null,
        title: 'Segundo Disco',
        type: 'EP',
        releaseDate: '2008',
        description: null,
        coverUrl: null,
        tracks: [
          { title: 'Faixa C', discNumber: 1, position: 1, durationMs: 100000 },
        ],
      },
    ],
  });
}

describe('Carga do catálogo (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let images: ImagesService;
  let png: Buffer;

  const fetchImage = async () => png;
  const load = (
    data: CatalogFile,
    options: { update?: boolean; covers?: boolean } = {},
    fetcher = fetchImage,
  ) =>
    loadCatalog({ prisma, images, fetchImage: fetcher }, data, {
      update: false,
      covers: false,
      ...options,
    });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    images = app.get(ImagesService);
    png = await coverPng();
    await cleanTestData(app);
    await prisma.genre.create({
      data: { name: 'E2E Gênero Importado', slug: 'e2e-genero-importado' },
    });
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  it('cria o artista, os lançamentos e as faixas', async () => {
    const report = await load(dataFile());

    expect(report).toMatchObject({
      artist: 'created',
      releases: { created: 2, updated: 0, kept: 0 },
      tracks: 3,
    });

    const artist = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-importada' },
      include: { genres: true, releases: true },
    });
    expect(artist.genres).toHaveLength(1);
    expect(artist.releases).toHaveLength(2);
    expect(artist.sources).toEqual([
      { name: 'Fonte', url: 'https://exemplo.com' },
    ]);

    const release = await prisma.release.findUniqueOrThrow({
      where: { mbid: 'e2e-mbid-2' },
    });
    expect(release).toMatchObject({
      slug: 'e2e-banda-importada-segundo-disco',
      datePrecision: 'YEAR',
    });
  });

  it('repetir não duplica nada nem desfaz edições feitas no admin', async () => {
    await prisma.artist.update({
      where: { slug: 'e2e-banda-importada' },
      data: { bio: 'Editada no admin.' },
    });

    const report = await load(dataFile());

    expect(report).toMatchObject({
      artist: 'kept',
      releases: { created: 0, updated: 0, kept: 2 },
    });
    expect(
      await prisma.release.count({
        where: { slug: { startsWith: 'e2e-banda-importada' } },
      }),
    ).toBe(2);
    const artist = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-importada' },
    });
    expect(artist.bio).toBe('Editada no admin.');
  });

  it('com update, o arquivo manda: troca o texto e substitui as faixas', async () => {
    const data = dataFile();
    data.artist.bio = 'Texto do arquivo.';
    data.releases[0].tracks = [
      { title: 'Única', discNumber: 1, position: 1, durationMs: 90000 },
    ];

    const report = await load(data, { update: true });

    expect(report).toMatchObject({
      artist: 'updated',
      releases: { updated: 2 },
    });
    const artist = await prisma.artist.findUniqueOrThrow({
      where: { slug: 'e2e-banda-importada' },
    });
    expect(artist.bio).toBe('Texto do arquivo.');
    const tracks = await prisma.track.findMany({
      where: { release: { mbid: 'e2e-mbid-1' } },
    });
    expect(tracks.map((track) => track.title)).toEqual(['Única']);
  });

  it('grava a capa e a cor, e não baixa de novo quando já existe', async () => {
    const first = await load(dataFile(), { covers: true });
    expect(first.covers).toEqual({ stored: 1, failed: [], skipped: null });

    const release = await prisma.release.findUniqueOrThrow({
      where: { mbid: 'e2e-mbid-1' },
    });
    expect(release.coverPath).toMatch(/^covers\//);
    expect(release.accentColor).toMatch(/^#[0-9A-F]{6}$/);

    const second = await load(dataFile(), { covers: true });
    expect(second.covers.stored).toBe(0);
  });

  it('uma capa que falha não interrompe a carga', async () => {
    await prisma.release.update({
      where: { mbid: 'e2e-mbid-1' },
      data: { coverPath: null, accentColor: null },
    });

    const report = await load(dataFile(), { covers: true }, () =>
      Promise.reject(new Error('fora do ar')),
    );

    expect(report.covers.stored).toBe(0);
    expect(report.covers.failed).toEqual(['Primeiro Disco: fora do ar']);
    expect(
      await prisma.release.count({
        where: { mbid: { in: ['e2e-mbid-1', 'e2e-mbid-2'] } },
      }),
    ).toBe(2);
  });

  it('sem armazenamento configurado, pula as capas em vez de falhar', async () => {
    vi.spyOn(images, 'store').mockRejectedValueOnce(
      new ServiceUnavailableException(),
    );

    const report = await load(dataFile(), { covers: true });

    expect(report.covers.skipped).toBe('disabled');
  });

  it('avisa quando um gênero do arquivo não existe, sem gravar nada', async () => {
    const data = dataFile();
    data.artist.slug = 'e2e-outra-banda';
    data.artist.genres = ['e2e-genero-que-nao-existe'];

    await expect(load(data)).rejects.toThrow(
      /e2e-genero-que-nao-existe.*seed:genres/,
    );
    expect(
      await prisma.artist.count({ where: { slug: 'e2e-outra-banda' } }),
    ).toBe(0);
  });
});
