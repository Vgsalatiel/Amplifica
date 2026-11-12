/**
 * Cria a árvore inicial de gêneros. Uso:
 *
 *   npm run seed:genres
 *
 * Pode rodar quantas vezes quiser: gêneros que já existem (pelo endereço) são
 * mantidos como estão, então nada que o admin tenha editado é sobrescrito.
 * Um gênero que o admin excluiu de propósito volta a ser criado se o script rodar de novo.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { slugify } from '../common/slug.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GENRE_SEEDS } from './genres-data.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

try {
  const prisma = app.get(PrismaService);
  const idsByName = new Map<string, string>();
  let created = 0;

  for (const seed of GENRE_SEEDS) {
    const slug = slugify(seed.name);
    const existing = await prisma.genre.findUnique({ where: { slug } });
    if (existing) {
      idsByName.set(seed.name, existing.id);
      continue;
    }

    const genre = await prisma.genre.create({
      data: {
        name: seed.name,
        slug,
        parentId: seed.parent ? (idsByName.get(seed.parent) ?? null) : null,
      },
    });
    idsByName.set(seed.name, genre.id);
    created += 1;
  }

  console.log(
    created === 0
      ? 'A árvore de gêneros já estava completa. Nada foi alterado.'
      : `${created} gênero(s) criado(s) de ${GENRE_SEEDS.length}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
