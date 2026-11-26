/**
 * Grava no banco os clipes fixos da playlist "Agora na tela". Uso:
 *
 *   npm run clips:seed -- prisma/data/clips/clips.json
 *
 * Seguro de repetir: o que já existe é mantido.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { clipsFileSchema, loadClips } from './clips-import/load-clips.js';

const file = process.argv[2];
if (!file) {
  console.error(
    'Informe o arquivo: npm run clips:seed -- prisma/data/clips/clips.json',
  );
  process.exit(1);
}
const path = resolve(file);
const parsed = clipsFileSchema.safeParse(
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
  const report = await loadClips(app.get(PrismaService), parsed.data);
  console.log(
    `Clipes: ${report.created} criado(s), ${report.kept} mantido(s), ${report.reordered} reordenado(s).`,
  );
  if (report.unlinkedArtists.length > 0) {
    console.warn(
      `Bandas que não estão no catálogo (o clipe entra sem link para elas): ${report.unlinkedArtists.join(', ')}.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
