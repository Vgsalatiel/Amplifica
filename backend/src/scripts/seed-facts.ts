/**
 * Grava no banco as curiosidades ("Você sabia?") das bandas. Uso:
 *
 *   npm run facts:seed -- prisma/data/facts/facts.json
 *
 * Seguro de repetir: a lista de cada banda do arquivo é trocada pela do arquivo.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { factsFileSchema, loadFacts } from './facts-import/load-facts.js';

const file = process.argv[2];
if (!file) {
  console.error(
    'Informe o arquivo: npm run facts:seed -- prisma/data/facts/facts.json',
  );
  process.exit(1);
}
const path = resolve(file);
const parsed = factsFileSchema.safeParse(
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
  const report = await loadFacts(app.get(PrismaService), parsed.data);
  console.log(`Curiosidades: ${report.updated} banda(s) atualizada(s).`);
  if (report.missing.length > 0) {
    console.warn(
      `Bandas que não estão no catálogo (puladas): ${report.missing.join(', ')}.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
