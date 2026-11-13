/**
 * Grava no banco um arquivo de dados de shows. Uso:
 *
 *   npm run shows:seed -- prisma/data/shows/2027.json
 *
 * Seguro de repetir: nada é duplicado. Por padrão, o que já existe é mantido como está,
 * então edições feitas no admin não são perdidas. Opção:
 *   --update   atualiza os shows que já existem a partir do arquivo
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { loadShows } from './shows-import/load-shows.js';
import { showsFileSchema } from './shows-import/shows-file.js';

const { values, positionals } = parseArgs({
  options: { update: { type: 'boolean', default: false } },
  allowPositionals: true,
});

if (!positionals[0]) {
  console.error(
    'Informe o arquivo: npm run shows:seed -- prisma/data/shows/ARQUIVO.json',
  );
  process.exit(1);
}
const path = resolve(positionals[0]);
const parsed = showsFileSchema.safeParse(
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
  const report = await loadShows(app.get(PrismaService), parsed.data, values);
  console.log(
    `Shows: ${report.created} criado(s), ${report.updated} atualizado(s), ${report.kept} mantido(s).`,
  );
  if (report.unlinkedArtists.length > 0) {
    console.warn(
      `Bandas que não estão no catálogo (o show entra sem link para elas): ${report.unlinkedArtists.join(', ')}.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
