/**
 * Grava no banco um arquivo de dados de catálogo (veja `npm run catalog:fetch`). Uso:
 *
 *   npm run catalog:seed -- prisma/data/bring-me-the-horizon.json --covers
 *
 * Seguro de repetir: nada é duplicado. Por padrão, o que já existe é mantido como está,
 * então edições feitas no admin não são perdidas. Opções:
 *   --update   atualiza artista, lançamentos e faixas existentes a partir do arquivo
 *   --covers   baixa as capas do Cover Art Archive e as grava no armazenamento de imagens
 *              (em produção, exige o bucket configurado; sem ele, as capas são puladas)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ImagesService } from '../modules/images/images.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { catalogFileSchema } from './catalog-import/catalog-file.js';
import { loadCatalog } from './catalog-import/load-catalog.js';

const MAX_COVER_BYTES = 10 * 1024 * 1024;

async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`o servidor de capas respondeu ${response.status}`);
  }
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error('a resposta não é uma imagem');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_COVER_BYTES) {
    throw new Error('imagem maior que 10 MB');
  }
  return buffer;
}

const { values, positionals } = parseArgs({
  options: {
    update: { type: 'boolean', default: false },
    covers: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

const path = resolve(positionals[0] ?? 'prisma/data/bring-me-the-horizon.json');
const parsed = catalogFileSchema.safeParse(
  JSON.parse(readFileSync(path, 'utf8')),
);
if (!parsed.success) {
  console.error(`O arquivo ${path} tem problemas:`);
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
try {
  const report = await loadCatalog(
    {
      prisma: app.get(PrismaService),
      images: app.get(ImagesService),
      fetchImage,
    },
    parsed.data,
    values,
  );

  console.log(
    `Artista ${parsed.data.artist.name}: ${report.artist === 'created' ? 'criado' : report.artist === 'updated' ? 'atualizado' : 'já existia, mantido'}.`,
  );
  console.log(
    `Lançamentos: ${report.releases.created} criado(s), ${report.releases.updated} atualizado(s), ${report.releases.kept} mantido(s).`,
  );
  if (values.covers) {
    console.log(`Capas: ${report.covers.stored} gravada(s).`);
    if (report.covers.skipped) {
      console.warn(
        'Capas puladas: o armazenamento de imagens não está configurado neste ambiente.',
      );
    }
    for (const failure of report.covers.failed) {
      console.warn(`Capa não gravada, ${failure}`);
    }
  }
  if (parsed.data.pending.length > 0) {
    console.log(
      `${parsed.data.pending.length} lançamento(s) pendente(s) de conferência foram ignorados.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
