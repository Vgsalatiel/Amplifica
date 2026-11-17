import { join } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';
import type { ImagesService } from '../../modules/images/images.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const entrySchema = z.object({
  slug: slugSchema,
  /** Caminho do arquivo, relativo à pasta das imagens. */
  file: z.string().min(1).max(200),
});

/**
 * Manifesto das imagens: qual arquivo vai para qual banda (foto) e qual para qual disco (capa).
 * As imagens em si ficam fora do repositório (os direitos são dos fotógrafos e dos selos); só este
 * arquivo, que diz onde cada uma entra, é versionado.
 */
export const imageManifestSchema = z.object({
  artists: z.array(entrySchema),
  releases: z.array(entrySchema).default([]),
});

export type ImageManifest = z.infer<typeof imageManifestSchema>;

export interface ImagesReport {
  stored: string[];
  /** Já tinham imagem e `replace` estava desligado. */
  kept: string[];
  /** O endereço não existe no banco. */
  missing: string[];
  /** Não foi possível ler ou gravar o arquivo. */
  failed: string[];
}

interface Deps {
  prisma: PrismaService;
  images: ImagesService;
  readFile: (path: string) => Promise<Buffer>;
}

/** A API só aceita JPEG, PNG e WebP: qualquer outro formato (AVIF, por exemplo) vira JPEG antes de gravar. */
export async function toAcceptedFormat(buffer: Buffer): Promise<Buffer> {
  const { format } = await sharp(buffer).metadata();
  if (format === 'jpeg' || format === 'png' || format === 'webp') {
    return buffer;
  }
  return sharp(buffer).jpeg({ quality: 92 }).toBuffer();
}

/**
 * Grava as imagens do manifesto pelo mesmo caminho do admin (`ImagesService`): duas versões em
 * WebP, cor de destaque nas capas e a imagem antiga apagada só depois da nova gravada. Sem
 * `replace`, quem já tem imagem é mantido, para não desfazer o que foi enviado pelo admin.
 */
export async function loadImages(
  { prisma, images, readFile }: Deps,
  manifest: ImageManifest,
  options: { baseDir: string; replace: boolean },
): Promise<ImagesReport> {
  const report: ImagesReport = {
    stored: [],
    kept: [],
    missing: [],
    failed: [],
  };

  const read = async (file: string) =>
    toAcceptedFormat(await readFile(join(options.baseDir, file)));
  const asUpload = (buffer: Buffer) =>
    ({ buffer, size: buffer.length }) as Express.Multer.File;

  for (const entry of manifest.artists) {
    const artist = await prisma.artist.findUnique({
      where: { slug: entry.slug },
    });
    if (!artist) {
      report.missing.push(entry.slug);
      continue;
    }
    if (artist.imagePath && !options.replace) {
      report.kept.push(entry.slug);
      continue;
    }
    try {
      const stored = await images.store(
        'artists',
        artist.id,
        asUpload(await read(entry.file)),
      );
      await prisma.artist.update({
        where: { id: artist.id },
        data: { imagePath: stored.path },
      });
      if (artist.imagePath && artist.imagePath !== stored.path) {
        await images.remove(artist.imagePath);
      }
      report.stored.push(entry.slug);
    } catch (error) {
      report.failed.push(
        `${entry.slug}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (const entry of manifest.releases) {
    const release = await prisma.release.findUnique({
      where: { slug: entry.slug },
    });
    if (!release) {
      report.missing.push(entry.slug);
      continue;
    }
    if (release.coverPath && !options.replace) {
      report.kept.push(entry.slug);
      continue;
    }
    try {
      const stored = await images.store(
        'covers',
        release.id,
        asUpload(await read(entry.file)),
      );
      await prisma.release.update({
        where: { id: release.id },
        data: { coverPath: stored.path, accentColor: stored.accentColor },
      });
      if (release.coverPath && release.coverPath !== stored.path) {
        await images.remove(release.coverPath);
      }
      report.stored.push(entry.slug);
    } catch (error) {
      report.failed.push(
        `${entry.slug}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return report;
}
