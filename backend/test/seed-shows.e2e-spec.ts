import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { loadShows } from '../src/scripts/shows-import/load-shows.js';
import {
  showsFileSchema,
  type ShowsFile,
} from '../src/scripts/shows-import/shows-file.js';
import { cleanTestData, createTestApp } from './helpers.js';

function dataFile(overrides: Record<string, unknown> = {}): ShowsFile {
  return showsFileSchema.parse({
    generatedAt: '2026-11-13T00:00:00Z',
    source: 'teste',
    shows: [
      {
        name: 'E2E Festival Importado',
        date: '2027-05-10',
        startTime: '17:00',
        venue: 'Arena Importada',
        city: 'Goiânia',
        state: 'GO',
        ticketUrl: 'https://ingressos.exemplo.test/importado',
        verifiedAt: '2026-11-13',
        acts: [
          {
            name: 'E2E Banda Importada Show',
            artist: 'e2e-banda-importada-show',
          },
          { name: 'E2E Banda de Fora Importada' },
        ],
        genres: ['e2e-genero-show-importado'],
        ...overrides,
      },
    ],
  });
}

describe('Carga de shows (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanTestData(app);
    await prisma.genre.create({
      data: {
        name: 'E2E Gênero Show Importado',
        slug: 'e2e-genero-show-importado',
      },
    });
    await prisma.artist.create({
      data: {
        name: 'E2E Banda Importada Show',
        slug: 'e2e-banda-importada-show',
      },
    });
  });

  afterAll(async () => {
    await cleanTestData(app);
    await app.close();
  });

  const importedShows = () =>
    prisma.show.findMany({
      where: { slug: { startsWith: 'e2e-' } },
      include: { acts: { orderBy: { position: 'asc' } }, genres: true },
    });

  it('grava show, escalação, gêneros e o link com a banda do catálogo', async () => {
    const report = await loadShows(prisma, dataFile(), { update: false });
    expect(report).toMatchObject({ created: 1, updated: 0, kept: 0 });

    const [show] = await importedShows();
    expect(show).toMatchObject({
      slug: 'e2e-festival-importado-goiania-2027-05-10',
      city: 'Goiânia',
      state: 'GO',
      startTime: '17:00',
      status: 'CONFIRMED',
    });
    expect(show?.verifiedAt.toISOString().slice(0, 10)).toBe('2026-11-13');
    expect(
      show?.acts.map((act) => [act.position, act.name, act.artistId !== null]),
    ).toEqual([
      [0, 'E2E Banda Importada Show', true],
      [1, 'E2E Banda de Fora Importada', false],
    ]);
    expect(show?.genres).toHaveLength(1);
  });

  it('repetir não duplica e mantém o que foi editado à mão', async () => {
    await prisma.show.updateMany({
      where: { slug: { startsWith: 'e2e-festival-importado' } },
      data: { venue: 'Arena Importada', startTime: '19:45' },
    });

    const report = await loadShows(prisma, dataFile(), { update: false });
    expect(report).toMatchObject({ created: 0, updated: 0, kept: 1 });

    const shows = await importedShows();
    expect(shows).toHaveLength(1);
    expect(shows[0]?.startTime).toBe('19:45');
  });

  it('reconhece o show por dia, cidade, local e primeira banda, sem diferenciar maiúsculas', async () => {
    const report = await loadShows(
      prisma,
      dataFile({ city: 'GOIÂNIA', venue: 'arena importada' }),
      { update: false },
    );
    expect(report.kept).toBe(1);
    expect(await importedShows()).toHaveLength(1);
  });

  it('com --update, atualiza o show existente a partir do arquivo', async () => {
    const report = await loadShows(
      prisma,
      dataFile({ startTime: '21:00', status: 'SOLD_OUT' }),
      { update: true },
    );
    expect(report).toMatchObject({ created: 0, updated: 1, kept: 0 });

    const [show] = await importedShows();
    expect(show).toMatchObject({ startTime: '21:00', status: 'SOLD_OUT' });
    expect(show?.acts).toHaveLength(2);
  });

  it('um show em outro dia ou local é um show novo', async () => {
    const report = await loadShows(prisma, dataFile({ date: '2027-05-11' }), {
      update: false,
    });
    expect(report.created).toBe(1);
    expect(await importedShows()).toHaveLength(2);
  });

  it('avisa das bandas que não estão no catálogo', async () => {
    const report = await loadShows(
      prisma,
      dataFile({
        date: '2027-06-01',
        acts: [{ name: 'E2E Sem Catálogo', artist: 'e2e-nao-existe' }],
      }),
      { update: false },
    );
    expect(report.unlinkedArtists).toEqual(['e2e-nao-existe']);

    const shows = await prisma.show.findMany({
      where: {
        date: new Date('2027-06-01T00:00:00Z'),
        slug: { startsWith: 'e2e-' },
      },
      include: { acts: true },
    });
    expect(shows[0]?.acts[0]?.artistId).toBeNull();
  });

  it('recusa gênero que não existe, sem gravar nada', async () => {
    const before = await prisma.show.count({
      where: { slug: { startsWith: 'e2e-' } },
    });
    await expect(
      loadShows(
        prisma,
        dataFile({ date: '2027-07-01', genres: ['e2e-genero-inexistente'] }),
        {
          update: false,
        },
      ),
    ).rejects.toThrow(/e2e-genero-inexistente/);
    expect(
      await prisma.show.count({ where: { slug: { startsWith: 'e2e-' } } }),
    ).toBe(before);
  });

  describe('formato do arquivo', () => {
    it('exige link, data de conferência e ao menos um gênero', () => {
      const base = dataFile().shows[0] as Record<string, unknown>;
      for (const missing of ['ticketUrl', 'verifiedAt', 'genres']) {
        const entry = { ...base };
        delete entry[missing];
        expect(
          showsFileSchema.safeParse({
            generatedAt: 'x',
            source: 'x',
            shows: [entry],
          }).success,
        ).toBe(false);
      }
    });
  });
});
