import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Clipes fixos da playlist "Agora na tela": abrem a playlist, antes das sugestões, na ordem em que
 * aparecem neste arquivo. O título e o canal são os que o YouTube informa para o vídeo.
 */
export const clipsFileSchema = z.object({
  clips: z.array(
    z.object({
      youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      title: z.string().min(1).max(200),
      channelName: z.string().min(1).max(120),
      /** Endereço (slug) da banda no catálogo, quando ela está lá. */
      artist: slugSchema.nullable().optional(),
    }),
  ),
});

export type ClipsFile = z.infer<typeof clipsFileSchema>;

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
        pinned: true,
        position,
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });
    report.created += 1;
  }
  return report;
}
