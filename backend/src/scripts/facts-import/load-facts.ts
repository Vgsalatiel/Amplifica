import { z } from 'zod';
import { slugSchema } from '../../common/slug.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Curiosidades da seção "Você sabia?" de cada banda. Cada uma traz a fonte de onde veio, e só
 * entra o que a fonte diz. O arquivo manda: a lista gravada para a banda é trocada pela do arquivo.
 */
export const factsFileSchema = z.object({
  bands: z.array(
    z.object({
      artist: slugSchema,
      facts: z
        .array(
          z.object({
            text: z.string().trim().min(20).max(300),
            sourceName: z.string().trim().min(1).max(80),
            sourceUrl: z
              .string()
              .url()
              .max(500)
              .refine((url) => url.startsWith('https://'), 'Use um link https.'),
          }),
        )
        .min(1)
        .max(6),
    }),
  ),
});

export type FactsFile = z.infer<typeof factsFileSchema>;

export interface FactsReport {
  updated: number;
  /** Bandas do arquivo que não existem no catálogo. */
  missing: string[];
}

/** Seguro de repetir: grava sempre a mesma lista. */
export async function loadFacts(
  prisma: PrismaService,
  file: FactsFile,
): Promise<FactsReport> {
  const report: FactsReport = { updated: 0, missing: [] };
  for (const band of file.bands) {
    const found = await prisma.artist.findUnique({
      where: { slug: band.artist },
    });
    if (!found) {
      report.missing.push(band.artist);
      continue;
    }
    await prisma.artist.update({
      where: { id: found.id },
      data: { facts: band.facts as Prisma.InputJsonValue },
    });
    report.updated += 1;
  }
  return report;
}
