import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Clipes fixos da playlist "Agora na tela". Os de abertura (padrão) vêm antes de tudo, na ordem do
 * arquivo. Os `catalog` (um de cada banda do site) vêm depois das sugestões aprovadas, para que o
 * pedido de uma pessoa continue sendo o próximo. O título e o canal são os que o YouTube informa.
 */
export const clipsFileSchema = z.object({
  clips: z.array(
    z.object({
      youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      title: z.string().min(1).max(200),
      channelName: z.string().min(1).max(120),
      /** Endereço (slug) da banda no catálogo, quando ela está lá. */
      artist: slugSchema.nullable().optional(),
      /** Clipe do catálogo: não abre a playlist, entra depois das sugestões aprovadas. */
      catalog: z.boolean().optional(),
    }),
  ),
});

export type ClipsFile = z.infer<typeof clipsFileSchema>;

/** Onde começam os clipes do catálogo na ordem da playlist (as sugestões ficam na posição 0). */
export const CATALOG_POSITION = 1000;

export interface ClipsReport {
  created: number;
  kept: number;
  /** Bandas citadas que não estão no catálogo: o clipe entra sem ligação com elas. */
  unlinkedArtists: string[];
}

/** Seguro de repetir: um clipe que já existe (pelo código do vídeo) é mantido como está. */
export async function loadClips(
  prisma: PrismaService,
  file: ClipsFile,
): Promise<ClipsReport> {
  const report: ClipsReport = { created: 0, kept: 0, unlinkedArtists: [] };

  for (const [position, entry] of file.clips.entries()) {
    if (
      await prisma.clip.findUnique({ where: { youtubeId: entry.youtubeId } })
    ) {
      report.kept += 1;
      continue;
    }
    const artist = entry.artist
      ? await prisma.artist.findUnique({ where: { slug: entry.artist } })
      : null;
    if (entry.artist && !artist) {
      report.unlinkedArtists.push(entry.artist);
    }
    await prisma.clip.create({
      data: {
        youtubeId: entry.youtubeId,
        title: entry.title,
        channelName: entry.channelName,
        artistId: artist?.id ?? null,
        pinned: !entry.catalog,
        // Sugestões aprovadas têm posição 0: as do catálogo ficam bem depois delas.
        position: entry.catalog ? CATALOG_POSITION + position : position,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });
    report.created += 1;
  }
  return report;
}
