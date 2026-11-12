import { ServiceUnavailableException } from '@nestjs/common';
import { slugify, uniqueSlug } from '../../common/slug.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ImagesService } from '../../modules/images/images.service.js';
import { parseReleaseDate } from '../../modules/releases/release-date.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CatalogFile, CatalogRelease } from './catalog-file.js';

export interface LoadOptions {
  /** Atualiza o que já existe a partir do arquivo. Sem isto, o que existe é mantido como está. */
  update: boolean;
  /** Baixa as capas do Cover Art Archive e as grava no armazenamento de imagens. */
  covers: boolean;
}

export interface LoadReport {
  artist: 'created' | 'updated' | 'kept';
  releases: { created: number; updated: number; kept: number };
  tracks: number;
  covers: { stored: number; failed: string[]; skipped: 'disabled' | null };
}

interface Dependencies {
  prisma: PrismaService;
  images: ImagesService;
  /** Baixa uma imagem. Injetável para os testes não dependerem da rede. */
  fetchImage: (url: string) => Promise<Buffer>;
}

/**
 * Grava no banco o artista e os lançamentos de um arquivo de dados. É seguro repetir:
 * os registros são encontrados pelo endereço (artista) e pelo identificador do MusicBrainz
 * (lançamento), então rodar duas vezes não duplica nada.
 */
export async function loadCatalog(
  { prisma, images, fetchImage }: Dependencies,
  data: CatalogFile,
  options: LoadOptions,
): Promise<LoadReport> {
  const genres = await prisma.genre.findMany({
    where: { slug: { in: data.artist.genres } },
  });
  const missing = data.artist.genres.filter(
    (slug) => !genres.some((genre) => genre.slug === slug),
  );
  if (missing.length > 0) {
    throw new Error(
      `Gêneros que não existem no banco: ${missing.join(', ')}. Rode "npm run seed:genres" ou cadastre-os no admin.`,
    );
  }

  const report: LoadReport = {
    artist: 'kept',
    releases: { created: 0, updated: 0, kept: 0 },
    tracks: 0,
    covers: { stored: 0, failed: [], skipped: null },
  };

  // --- artista
  const { genres: _genreSlugs, ...artistFields } = data.artist;
  const artistData = {
    ...artistFields,
    sources: artistFields.sources as Prisma.InputJsonValue,
  };
  const genreLinks = genres.map((genre) => ({ genreId: genre.id }));

  let artist = await prisma.artist.findUnique({
    where: { slug: data.artist.slug },
  });
  if (!artist) {
    artist = await prisma.artist.create({
      data: { ...artistData, genres: { create: genreLinks } },
    });
    report.artist = 'created';
  } else if (options.update) {
    artist = await prisma.artist.update({
      where: { id: artist.id },
      data: { ...artistData, genres: { deleteMany: {}, create: genreLinks } },
    });
    report.artist = 'updated';
  }

  // --- lançamentos
  for (const release of data.releases) {
    const fields = releaseFields(release);
    const tracks = release.tracks.map((track) => ({ ...track }));
    report.tracks += tracks.length;

    const existing = await prisma.release.findUnique({
      where: { mbid: release.mbid },
    });
    if (!existing) {
      const slug = await uniqueSlug(
        slugify(`${artist.slug} ${release.title}`),
        async (candidate) => {
          return (
            (await prisma.release.count({ where: { slug: candidate } })) > 0
          );
        },
      );
      await prisma.release.create({
        data: {
          ...fields,
          slug,
          artists: {
            create: [{ artistId: artist.id, role: 'PRIMARY', position: 0 }],
          },
          tracks: { create: tracks },
        },
      });
      report.releases.created += 1;
    } else if (options.update) {
      await prisma.$transaction([
        prisma.track.deleteMany({ where: { releaseId: existing.id } }),
        prisma.release.update({
          where: { id: existing.id },
          data: { ...fields, tracks: { create: tracks } },
        }),
      ]);
      report.releases.updated += 1;
    } else {
      report.releases.kept += 1;
    }
  }

  // --- capas
  if (options.covers) {
    for (const release of data.releases) {
      if (!release.coverUrl || report.covers.skipped) {
        continue;
      }
      const stored = await prisma.release.findUnique({
        where: { mbid: release.mbid },
      });
      if (!stored || stored.coverPath) {
        continue;
      }

      try {
        const buffer = await fetchImage(release.coverUrl);
        const image = await images.store('covers', stored.id, {
          buffer,
          size: buffer.length,
        } as Express.Multer.File);
        await prisma.release.update({
          where: { id: stored.id },
          data: { coverPath: image.path, accentColor: image.accentColor },
        });
        report.covers.stored += 1;
      } catch (error) {
        // Sem bucket configurado em produção, nenhuma capa pode ser gravada: para por aqui.
        if (error instanceof ServiceUnavailableException) {
          report.covers.skipped = 'disabled';
        } else {
          report.covers.failed.push(
            `${release.title}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  return report;
}

function releaseFields(release: CatalogRelease) {
  const { date, precision } = parseReleaseDate(release.releaseDate)!;
  return {
    title: release.title,
    type: release.type,
    releaseDate: date,
    datePrecision: precision,
    description: release.description,
    mbid: release.mbid,
  };
}
