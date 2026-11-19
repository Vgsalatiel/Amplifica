/**
 * Grava no banco as fotos das bandas e as capas listadas num manifesto. Uso:
 *
 *   npm run images:seed -- prisma/data/images/band-images.json --dir ../frontend/img/bandasimgaens
 *
 * Seguro de repetir. Por padrão, quem já tem imagem é mantido (o que foi enviado pelo admin não é
 * desfeito). Opções:
 *   --dir <pasta>   pasta onde estão os arquivos (padrão: ../frontend/img/bandasimgaens)
 *   --replace       troca também as imagens que já existem
 *   --only a,b      só estas bandas e discos do manifesto (pelo endereço), ignorando o resto
 *
 * Imagens AVIF são convertidas para JPEG, porque a API só aceita JPEG, PNG e WebP. As imagens em si
 * não vão para o repositório: os direitos são de quem as fez.
 */
import { readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ImagesService } from '../modules/images/images.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  imageManifestSchema,
  loadImages,
} from './images-import/load-images.js';

const { values, positionals } = parseArgs({
  options: {
    dir: { type: 'string', default: '../frontend/img/bandasimgaens' },
    replace: { type: 'boolean', default: false },
    only: { type: 'string', default: '' },
  },
  allowPositionals: true,
});

if (!positionals[0]) {
  console.error(
    'Informe o manifesto: npm run images:seed -- prisma/data/images/ARQUIVO.json',
  );
  process.exit(1);
}
const path = resolve(positionals[0]);
const parsed = imageManifestSchema.safeParse(
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
  const report = await loadImages(
    {
      prisma: app.get(PrismaService),
      images: app.get(ImagesService),
      readFile: readFileAsync,
    },
    parsed.data,
    {
      baseDir: resolve(values.dir),
      replace: values.replace,
      only: values.only
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean),
    },
  );
  console.log(
    `Imagens: ${report.stored.length} gravada(s), ${report.kept.length} mantida(s).`,
  );
  if (report.missing.length > 0) {
    console.warn(`Não existem no banco: ${report.missing.join(', ')}.`);
  }
  for (const failure of report.failed) {
    console.error(`Falhou: ${failure}`);
  }
  if (report.failed.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
